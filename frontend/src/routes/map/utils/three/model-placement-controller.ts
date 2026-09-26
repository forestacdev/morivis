import type { ModelTransformStyle, ThreeModelEntry } from '$routes/map/data/types/model';
import type { Map as MapLibreMap } from '$routes/map/utils/maplibre';
import {
	getModelScaleFromHandleDrag,
	getModelScaleHandles,
	getOppositeModelScaleHandle,
	isModelPlacementBoundsHit,
	keepModelPlacementAboveGround,
	type ModelPlacementTransform,
	type ModelScaleHandleKey,
	preserveModelLocalPointPosition
} from '$routes/map/utils/three/model-placement-scale';
import { getEffectiveModelScale, normalizeModelScale } from '$routes/map/utils/three/model-scale';
import type { ModelTransform } from '$routes/map/utils/three/model-transform';
import {
	createPlacementPreviewObject,
	disposePlacementPreviewObject,
	getPlacementPreviewBounds,
	getPlacementPreviewBoundsKey,
	renderPlacementPreviewPass
} from '$routes/map/utils/three/placement-preview';
import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildMercatorModelMatrix } from './mercator-model-matrix';
const normalizeRadians = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
interface ModelPlacementOptions {
	isModelViewActive: () => boolean;
	onModelTransform: (entryId: string, style: ModelTransformStyle) => void;
}
export class ModelPlacementController {
	private map: MapLibreMap | null = null;
	private scene: THREE.Scene | null = null;
	private camera: THREE.Camera | null = null;
	private finishHandleDrag: (() => void) | null = null;
	constructor(private readonly options: ModelPlacementOptions) {}
	private placementLabelRenderer: CSS2DRenderer | null = null;
	private placementLabelSize = { width: 0, height: 0 };
	private placementTransformChangeHandler: ((transform: ModelPlacementTransform) => void) | null =
		null;
	private placementMoveDrag: {
		pointerId: number;
		startClientX: number;
		startClientY: number;
		startAnchorX: number;
		startAnchorY: number;
		startTransform: ModelPlacementTransform;
		dragPanWasEnabled: boolean;
		previousCursor: string;
	} | null = null;
	private placementPreview: {
		entryId: string;
		object: THREE.Group;
		handles: THREE.Group;
		localBounds: ReturnType<typeof getPlacementPreviewBounds>;
		transform: ModelTransform;
		boundsKey: string;
		styleTransform: ModelPlacementTransform;
	} | null = null;
	private lastMapProjectionMatrix: THREE.Matrix4 | null = null;
	private calculateTransform = (style: ModelTransformStyle): ModelTransform => ({
		matrix: buildMercatorModelMatrix(style.transform, Boolean(this.map?.getTerrain()))
	});
	attach = (map: MapLibreMap, scene: THREE.Scene, camera: THREE.Camera) => {
		this.detach();
		this.map = map;
		this.scene = scene;
		this.camera = camera;
		this.ensurePlacementLabelRenderer();
		this.addPlacementPointerListeners();
	};
	detach = () => {
		this.removePlacementPointerListeners();
		this.clearPlacementPreview();
		this.removePlacementLabelRenderer();
		this.map = null;
		this.scene = null;
		this.camera = null;
		this.lastMapProjectionMatrix = null;
	};
	dispose = () => {
		this.detach();
		this.placementTransformChangeHandler = null;
	};
	get hasPreview(): boolean {
		return this.placementPreview !== null;
	}
	hide = () => {
		if (this.placementPreview) this.placementPreview.object.visible = false;
		if (this.placementLabelRenderer) {
			this.placementLabelRenderer.domElement.style.display = 'none';
		}
	};
	setProjection = (projection: THREE.Matrix4) => {
		this.lastMapProjectionMatrix = projection;
	};
	render = (projection: THREE.Matrix4, renderer: THREE.WebGLRenderer) => {
		this.hide();
		if (!this.placementPreview || !this.scene || !this.camera) return;
		renderPlacementPreviewPass({
			camera: this.camera,
			object: this.placementPreview.object,
			projectionMatrix: projection.clone().multiply(this.placementPreview.transform.matrix),
			renderer,
			scene: this.scene
		});
		this.renderPlacementScaleHandles(projection);
	};
	private ensurePlacementLabelRenderer = () => {
		if (!this.map || this.placementLabelRenderer) return;

		const renderer = new CSS2DRenderer();
		const element = renderer.domElement;
		element.style.position = 'absolute';
		element.style.inset = '0';
		element.style.pointerEvents = 'none';
		element.style.zIndex = '3';
		element.style.display = 'none';
		this.map.getCanvasContainer().appendChild(element);
		this.placementLabelRenderer = renderer;
	};

	private removePlacementLabelRenderer = () => {
		this.placementLabelRenderer?.domElement.remove();
		this.placementLabelRenderer = null;
		this.placementLabelSize = { width: 0, height: 0 };
	};

	private getPlacementClientPoint = (
		localPosition: [number, number, number],
		modelTransform = this.placementPreview?.transform
	): [number, number] | null => {
		if (!this.map || !this.lastMapProjectionMatrix || !this.placementPreview) return null;
		if (!modelTransform) return null;

		const canvasRect = this.map.getCanvas().getBoundingClientRect();
		const projectionMatrix = this.lastMapProjectionMatrix
			.clone()
			.multiply(modelTransform.matrix);
		const projected = new THREE.Vector3(...localPosition).applyMatrix4(projectionMatrix);
		if (![projected.x, projected.y].every(Number.isFinite)) return null;

		return [
			canvasRect.left + ((projected.x + 1) / 2) * canvasRect.width,
			canvasRect.top + ((1 - projected.y) / 2) * canvasRect.height
		];
	};

	private isPlacementPreviewHit = (event: PointerEvent) => {
		if (!this.map || !this.lastMapProjectionMatrix || !this.placementPreview) return false;
		const canvasRect = this.map.getCanvas().getBoundingClientRect();
		return isModelPlacementBoundsHit({
			canvasHeight: canvasRect.height,
			canvasWidth: canvasRect.width,
			clientX: event.clientX - canvasRect.left,
			clientY: event.clientY - canvasRect.top,
			localBounds: this.placementPreview.localBounds,
			localToClipMatrix: this.lastMapProjectionMatrix
				.clone()
				.multiply(this.placementPreview.transform.matrix)
		});
	};

	private finishPlacementMoveDrag = () => {
		const drag = this.placementMoveDrag;
		if (!drag) return;
		const canvas = this.map?.getCanvas();
		if (canvas?.hasPointerCapture(drag.pointerId)) canvas.releasePointerCapture(drag.pointerId);
		if (canvas) canvas.style.cursor = drag.previousCursor;
		if (drag.dragPanWasEnabled) this.map?.dragPan.enable();
		this.placementMoveDrag = null;
	};

	private handlePlacementPointerDown = (event: PointerEvent) => {
		if (
			event.button !== 0
			|| this.options.isModelViewActive()
			|| !this.map
			|| !this.placementPreview
			|| !this.isPlacementPreviewHit(event)
		) {
			return;
		}

		const canvas = this.map.getCanvas();
		const startAnchor = this.map.project([
			this.placementPreview.styleTransform.lng,
			this.placementPreview.styleTransform.lat
		]);
		const dragPanWasEnabled = this.map.dragPan.isEnabled();
		if (dragPanWasEnabled) this.map.dragPan.disable();
		this.placementMoveDrag = {
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startAnchorX: startAnchor.x,
			startAnchorY: startAnchor.y,
			startTransform: { ...this.placementPreview.styleTransform },
			dragPanWasEnabled,
			previousCursor: canvas.style.cursor
		};
		canvas.style.cursor = 'grabbing';
		canvas.setPointerCapture(event.pointerId);
		event.preventDefault();
		event.stopImmediatePropagation();
	};

	private handlePlacementPointerMove = (event: PointerEvent) => {
		const drag = this.placementMoveDrag;
		if (!drag || drag.pointerId !== event.pointerId || !this.map) return;
		const lngLat = this.map.unproject([
			drag.startAnchorX + event.clientX - drag.startClientX,
			drag.startAnchorY + event.clientY - drag.startClientY
		]);
		this.placementTransformChangeHandler?.({
			...drag.startTransform,
			lng: lngLat.lng,
			lat: lngLat.lat
		});
		event.preventDefault();
		event.stopImmediatePropagation();
	};

	private handlePlacementPointerEnd = (event: PointerEvent) => {
		if (this.placementMoveDrag?.pointerId !== event.pointerId) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		this.finishPlacementMoveDrag();
	};

	private addPlacementPointerListeners = () => {
		const canvas = this.map?.getCanvas();
		if (!canvas) return;
		canvas.addEventListener('pointerdown', this.handlePlacementPointerDown, true);
		canvas.addEventListener('pointermove', this.handlePlacementPointerMove, true);
		canvas.addEventListener('pointerup', this.handlePlacementPointerEnd, true);
		canvas.addEventListener('pointercancel', this.handlePlacementPointerEnd, true);
	};

	private removePlacementPointerListeners = () => {
		const canvas = this.map?.getCanvas();
		if (!canvas) return;
		this.finishPlacementMoveDrag();
		canvas.removeEventListener('pointerdown', this.handlePlacementPointerDown, true);
		canvas.removeEventListener('pointermove', this.handlePlacementPointerMove, true);
		canvas.removeEventListener('pointerup', this.handlePlacementPointerEnd, true);
		canvas.removeEventListener('pointercancel', this.handlePlacementPointerEnd, true);
	};

	private resolvePlacementYRotation = ({
		draggedLocalPosition,
		fixedClientPosition,
		fixedLocalPosition,
		startAngle,
		startTransform
	}: {
		draggedLocalPosition: [number, number, number];
		fixedClientPosition: [number, number];
		fixedLocalPosition: [number, number, number];
		startAngle: number;
		startTransform: ModelPlacementTransform;
	}): number => {
		const terrainEnabled = Boolean(this.map?.getTerrain());
		const rotatedTransform = preserveModelLocalPointPosition({
			fixedLocalPosition,
			startTransform,
			nextTransform: { ...startTransform, rotationY: startTransform.rotationY + 1 },
			terrainEnabled
		});
		const draggedClientPosition = this.getPlacementClientPoint(
			draggedLocalPosition,
			this.calculateTransform({ transform: rotatedTransform })
		);
		if (!draggedClientPosition) {
			return THREE.MathUtils.RAD2DEG;
		}

		const angle = Math.atan2(
			draggedClientPosition[1] - fixedClientPosition[1],
			draggedClientPosition[0] - fixedClientPosition[0]
		);
		const screenRadiansPerDegree = normalizeRadians(angle - startAngle);
		if (Math.abs(screenRadiansPerDegree) <= 1e-6) {
			return THREE.MathUtils.RAD2DEG;
		}

		return 1 / screenRadiansPerDegree;
	};

	private startPlacementTransformDrag = (
		event: PointerEvent,
		element: HTMLButtonElement,
		handleKey: ModelScaleHandleKey,
		draggedLocalPosition: [number, number, number],
		localBounds: ReturnType<typeof getPlacementPreviewBounds>
	) => {
		if (event.button !== 0 || !this.placementPreview) return;
		const oppositeHandle = getOppositeModelScaleHandle(localBounds, handleKey);
		const fixedClientPosition = this.getPlacementClientPoint(oppositeHandle.position);
		if (!fixedClientPosition) return;

		const elementRect = element.getBoundingClientRect();
		const handleCenterX = elementRect.left + elementRect.width / 2;
		const handleCenterY = elementRect.top + elementRect.height / 2;
		const pointerOffsetX = event.clientX - handleCenterX;
		const pointerOffsetY = event.clientY - handleCenterY;
		const startVector: [number, number] = [
			handleCenterX - fixedClientPosition[0],
			handleCenterY - fixedClientPosition[1]
		];
		const startDistance = Math.hypot(startVector[0], startVector[1]);
		if (startDistance <= Number.EPSILON) return;

		const pointerId = event.pointerId;
		const startTransform = { ...this.placementPreview.styleTransform };
		const startAngle = Math.atan2(startVector[1], startVector[0]);
		const degreesPerScreenRadian = this.resolvePlacementYRotation({
			draggedLocalPosition,
			fixedClientPosition,
			fixedLocalPosition: oppositeHandle.position,
			startAngle,
			startTransform
		});
		const terrainEnabled = Boolean(this.map?.getTerrain());
		const startEffectiveScale = getEffectiveModelScale(startTransform);
		const handlePointerMove = (moveEvent: PointerEvent) => {
			if (moveEvent.pointerId !== pointerId) return;
			moveEvent.preventDefault();
			moveEvent.stopPropagation();
			const currentVector: [number, number] = [
				moveEvent.clientX - pointerOffsetX - fixedClientPosition[0],
				moveEvent.clientY - pointerOffsetY - fixedClientPosition[1]
			];
			const currentDistance = Math.hypot(currentVector[0], currentVector[1]);
			const currentAngle = Math.atan2(currentVector[1], currentVector[0]);
			const nextScale = normalizeModelScale(
				getModelScaleFromHandleDrag({
					currentDistance,
					startDistance,
					startScale: startEffectiveScale
				})
			);
			const nextTransform = {
				...startTransform,
				...nextScale,
				rotationY: startTransform.rotationY
					+ normalizeRadians(currentAngle - startAngle) * degreesPerScreenRadian
			};
			const anchoredTransform = preserveModelLocalPointPosition({
				fixedLocalPosition: oppositeHandle.position,
				nextTransform,
				startTransform,
				terrainEnabled
			});
			this.placementTransformChangeHandler?.(
				keepModelPlacementAboveGround({
					groundAltitudeAt: (lng, lat) =>
						terrainEnabled ? (this.map?.queryTerrainElevation([lng, lat]) ?? 0) : 0,
					localBounds,
					transform: anchoredTransform,
					terrainEnabled
				})
			);
		};
		const cleanup = () => {
			element.removeEventListener('pointermove', handlePointerMove);
			element.removeEventListener('pointerup', finishPointerDrag);
			element.removeEventListener('pointercancel', finishPointerDrag);
			if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
			this.finishHandleDrag = null;
		};
		const finishPointerDrag = (finishEvent: PointerEvent) => {
			if (finishEvent.pointerId !== pointerId) return;
			finishEvent.preventDefault();
			finishEvent.stopPropagation();
			cleanup();
		};
		this.finishHandleDrag?.();
		this.finishHandleDrag = cleanup;

		event.preventDefault();
		event.stopPropagation();
		element.setPointerCapture(pointerId);
		element.addEventListener('pointermove', handlePointerMove);
		element.addEventListener('pointerup', finishPointerDrag);
		element.addEventListener('pointercancel', finishPointerDrag);
	};

	private createPlacementScaleHandles = (
		bounds: ReturnType<typeof getPlacementPreviewBounds>
	) => {
		const group = new THREE.Group();
		getModelScaleHandles(bounds).forEach(({ key, position }) => {
			const element = document.createElement('button');
			element.type = 'button';
			element.ariaLabel = `モデル範囲の頂点 ${key}`;
			element.title = 'ドラッグしてモデル全体を拡大・縮小';
			element.style.width = '18px';
			element.style.height = '18px';
			element.style.padding = '0';
			element.style.border = '2px solid white';
			element.style.borderRadius = '50%';
			element.style.background = '#45a17f';
			element.style.boxShadow = '0 1px 5px rgb(0 0 0 / 65%)';
			element.style.cursor = 'nwse-resize';
			element.style.pointerEvents = 'auto';
			element.style.touchAction = 'none';
			element.addEventListener('pointerdown', (event) => {
				this.startPlacementTransformDrag(event, element, key, position, bounds);
			});

			const handle = new CSS2DObject(element);
			handle.name = `model-placement-scale-${key}`;
			handle.position.set(position[0], position[1], position[2]);
			group.add(handle);
		});
		return group;
	};

	private disposePlacementScaleHandles = (handles: THREE.Group) => {
		this.finishHandleDrag?.();
		// Group を Scene から外すだけでは、子の CSS2DObject に removed が通知されず
		// DOM 要素が CSS2DRenderer 内に残るため、先に子要素を明示的に外す。
		handles.clear();
		handles.removeFromParent();
	};

	private renderPlacementScaleHandles = (mapProjectionMatrix: THREE.Matrix4) => {
		if (
			!this.map
			|| !this.scene
			|| !this.camera
			|| !this.placementPreview
			|| !this.placementLabelRenderer
		) {
			if (this.placementLabelRenderer) {
				this.placementLabelRenderer.domElement.style.display = 'none';
			}
			return;
		}

		const canvas = this.map.getCanvas();
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		if (width !== this.placementLabelSize.width || height !== this.placementLabelSize.height) {
			this.placementLabelRenderer.setSize(width, height);
			this.placementLabelSize = { width, height };
		}

		this.placementLabelRenderer.domElement.style.display = 'block';
		this.camera.projectionMatrix = mapProjectionMatrix
			.clone()
			.multiply(this.placementPreview.transform.matrix);
		this.placementLabelRenderer.render(this.scene, this.camera);
	};

	setPlacementTransformChangeHandler = (
		handler: ((transform: ModelPlacementTransform) => void) | null
	): void => {
		this.placementTransformChangeHandler = handler;
	};

	setPlacementPreview = (
		entry: ThreeModelEntry,
		style = entry.style,
		{ showTransformHandles = true }: { showTransformHandles?: boolean; } = {}
	): void => {
		if (!this.scene) return;
		const bounds = getPlacementPreviewBounds(entry);
		const boundsKey = `${getPlacementPreviewBoundsKey(bounds)}:${showTransformHandles}`;
		if (
			!this.placementPreview
			|| this.placementPreview.entryId !== entry.id
			|| this.placementPreview.boundsKey !== boundsKey
		) {
			if (this.placementPreview) {
				this.scene.remove(this.placementPreview.object);
				this.disposePlacementScaleHandles(this.placementPreview.handles);
				disposePlacementPreviewObject(this.placementPreview.object);
			}
			const object = createPlacementPreviewObject(bounds);
			const handles = showTransformHandles
				? this.createPlacementScaleHandles(bounds)
				: new THREE.Group();
			this.scene.add(object, handles);
			this.placementPreview = {
				entryId: entry.id,
				object,
				handles,
				localBounds: bounds,
				transform: this.calculateTransform(style),
				boundsKey,
				styleTransform: { ...style.transform }
			};
		} else {
			this.placementPreview.transform = this.calculateTransform(style);
			this.placementPreview.styleTransform = { ...style.transform };
		}
		this.options.onModelTransform(entry.id, style);
		this.map?.triggerRepaint();
	};

	clearPlacementPreview = (): void => {
		this.finishPlacementMoveDrag();
		this.finishHandleDrag?.();
		const preview = this.placementPreview;
		if (preview) {
			this.scene?.remove(preview.object);
			this.disposePlacementScaleHandles(preview.handles);
			disposePlacementPreviewObject(preview.object);
			this.placementPreview = null;
		}
		if (this.placementLabelRenderer) {
			// 過去のプレビューなどから残留した CSS2D 要素も確実に破棄する。
			this.placementLabelRenderer.domElement.replaceChildren();
			this.placementLabelRenderer.domElement.style.display = 'none';
		}
		if (preview) this.map?.triggerRepaint();
	};
}

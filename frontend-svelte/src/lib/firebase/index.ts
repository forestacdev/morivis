import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
	apiKey: 'AIzaSyBEjNfLefMR1WJdDbPP1BE8WnYqTboBFVw',
	authDomain: 'ensyurin-webgis.firebaseapp.com',
	projectId: 'ensyurin-webgis',
	storageBucket: 'ensyurin-webgis.appspot.com',
	messagingSenderId: '800775200419',
	appId: '1:800775200419:web:3e4160e41be955e3d42916',
	measurementId: 'G-ZHD1X0VQB0'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

provider.setCustomParameters({
	hd: 'mierune.co.jp'
});

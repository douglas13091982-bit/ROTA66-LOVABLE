export type ConectorConfig = {
  id: string;
  provider: 'firebase' | 'google_cloud';
  nome: string;
  config: Record<string, any>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

export type GoogleCloudConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  region?: string;
};

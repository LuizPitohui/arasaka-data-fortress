import axios from 'axios';

export const api = axios.create({
  // MUDANÇA CRÍTICA: Apontando direto para o IP do Django (Porta 8000)
  // Removemos a dependência do Proxy do Vite
  baseURL: 'http://127.0.0.1:8000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});
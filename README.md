# Return Tech — como rodar o frontend

Requer Node.js 24 e o backend, o MongoDB e o Judge0 configurados. O passo a passo completo está no [README do backend](../Return_Tech_Backend/README.md).

## 1. Configuração

No `.env` existente desta pasta:

```env
VITE_API_URL=http://localhost:5000/api
```

## 2. Instalar dependências uma vez

Dentro de `Return_Tech_Frontend`, no Windows ou Linux:

```bash
npm ci
```

## 3. Iniciar

Com o backend, a fila de correções e o Judge0 em execução:

```bash
npm run dev
```

Abra **http://localhost:5173** e mantenha o terminal aberto. Para parar, use `Ctrl+C`.

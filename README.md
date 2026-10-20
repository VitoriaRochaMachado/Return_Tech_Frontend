# Return Tech

Plataforma que conecta estudantes e profissionais a empresas por meio de desafios e processos seletivos na área de cibersegurança.

## Tecnologias

- Frontend: React + Vite
- Backend: Python + Flask
- Banco de dados: MongoDB
- Banco local: Docker
- Autenticação: JWT

## Estrutura

```text
Return_Tech_Frontend/
Return_Tech_Backend/
```

## Requisitos

Antes de começar, instale:

- Node.js 22 ou superior
- Python 3.11 ou superior
- Docker Desktop
- Visual Studio Code

## Arquivo `.env`

O arquivo `.env` do backend não está no GitHub por segurança.

Solicite o arquivo `.env` à responsável pelo projeto e coloque-o diretamente dentro da pasta:

```text
Return_Tech_Backend/
├── .env
├── run.py
├── requirements.txt
└── docker-compose.yml
```

Nunca envie o `.env` para o GitHub.

---

# Como executar o backend

Abra a pasta `Return_Tech_Backend` no VS Code e abra um terminal PowerShell.

Execute cada comando separadamente.

## 1. Criar o ambiente virtual

Esta etapa só precisa ser feita na primeira execução:

```powershell
python -m venv .venv
```

## 2. Ativar o ambiente virtual

```powershell
.venv\Scripts\Activate.ps1
```

Quando estiver ativo, o terminal apresentará:

```text
(.venv)
```

## 3. Instalar as dependências

Esta etapa só precisa ser feita na primeira execução ou quando o `requirements.txt` mudar:

```powershell
pip install -r requirements.txt
```

## 4. Iniciar o MongoDB

Abra o Docker Desktop e espere o Docker Engine iniciar.

Depois, no terminal do backend:

```powershell
docker compose up -d
```

Confira se o MongoDB está funcionando:

```powershell
docker ps
```

Deve aparecer um contêiner chamado:

```text
return-tech-mongo
```

## 5. Iniciar o Flask

```powershell
python run.py
```

O backend ficará disponível em:

```text
http://127.0.0.1:5000
```

Para testar a API, acesse:

```text
http://127.0.0.1:5000/api/health
```

Resultado esperado:

```json
{
  "service": "return-tech-api",
  "status": "ok"
}
```

Não feche esse terminal enquanto estiver utilizando o sistema.

---

# Como executar o frontend

Abra a pasta `Return_Tech_Frontend` em outra janela do VS Code ou abra um segundo terminal.

## 1. Instalar as dependências

Esta etapa só precisa ser feita na primeira execução:

```powershell
npm install
```

## 2. Iniciar o React

```powershell
npm run dev
```

O frontend ficará disponível em:

```text
http://localhost:5173
```

Não feche esse terminal enquanto estiver utilizando o sistema.

---

# Ordem para iniciar o sistema

Sempre execute nesta ordem:

1. Abrir o Docker Desktop.
2. Executar `docker compose up -d` no backend.
3. Ativar a `.venv`.
4. Executar `python run.py`.
5. Executar `npm run dev` no frontend.
6. Abrir `http://localhost:5173`.

São necessários dois terminais:

- Terminal 1: backend Flask;
- Terminal 2: frontend React.

---

# Como testar o fluxo completo

1. Crie uma conta do tipo Empresa.
2. Publique um desafio de cibersegurança.
3. Abra uma janela anônima do navegador.
4. Crie uma conta de Estudante/Profissional.
5. Entre no desafio e envie uma solução.
6. Volte para a conta da empresa.
7. Avalie a entrega e adicione o participante à shortlist.

A janela anônima é necessária para manter duas contas conectadas simultaneamente.

---

# Como encerrar

Nos terminais do Flask e React, pressione:

```text
Ctrl + C
```

Para parar o MongoDB, execute na pasta do backend:

```powershell
docker compose stop
```

Os dados permanecerão salvos no volume do Docker.

---

# Próximas execuções

Não é necessário instalar tudo novamente.

## Backend

```powershell
.venv\Scripts\Activate.ps1
docker compose up -d
python run.py
```

## Frontend

```powershell
npm run dev
```

---

# Problemas comuns

## Erro `dockerDesktopLinuxEngine`

O Docker Desktop não está ligado. Abra-o e aguarde o Engine iniciar.

## Erro de conexão com `localhost:27017`

O MongoDB não está funcionando. Execute:

```powershell
docker compose up -d
```

## A página `http://127.0.0.1:5000` mostra 404

Isso é normal. O backend não possui página visual na rota principal.

Use:

```text
http://127.0.0.1:5000/api/health
```

## O frontend não abre

Confirme se o terminal mostra:

```text
Local: http://localhost:5173
```

## O site abre, mas cadastro e login não funcionam

Confirme se:

- Docker Desktop está aberto;
- `return-tech-mongo` aparece no `docker ps`;
- Flask está rodando na porta 5000;
- React está rodando na porta 5173.

# Return Tech — Frontend React

Interface completa para estudantes/profissionais e empresas, conectada à API Flask.

## Executar localmente

1. Instale o Node.js 22 ou superior.
2. Abra esta pasta no terminal.
3. Rode:

```bash
npm install
cp .env.example .env
npm run dev
```

No Windows (PowerShell), use `Copy-Item .env.example .env` no lugar do comando `cp`.

Acesse `http://localhost:5173`. O backend deve estar rodando em `http://localhost:5000`.

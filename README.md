# Return Tech — Frontend React

Interface web da Return Tech, plataforma que conecta empresas a estudantes e profissionais de cibersegurança por meio de desafios técnicos e processos seletivos baseados em evidências práticas.

Este repositório contém somente o **frontend**. A API Flask está no projeto `Return_Tech_Backend`.

## Tecnologias

- React
- Vite
- JavaScript
- CSS
- API REST
- Autenticação JWT

## Perfis disponíveis

A aplicação possui dois fluxos principais:

- **Estudante/Profissional:** criação de perfil, participação em desafios, envio de soluções, acompanhamento de avaliações e portfólio;
- **Empresa:** criação de desafios, avaliação de entregas, consulta de candidatos e shortlist.

## Requisitos

Antes de começar, instale:

- Node.js 22 ou superior;
- Visual Studio Code ou outro editor de código;
- Git, caso o projeto seja obtido pelo GitHub.

O backend também precisa estar configurado e em execução.

---

# Primeira execução

## 1. Abrir a pasta do frontend

Abra a pasta `Return_Tech_Frontend` no VS Code.

No terminal PowerShell, confirme que ele está nessa pasta:

```text
Return_Tech_Frontend
```

## 2. Instalar as dependências

```powershell
npm install
```

Essa etapa precisa ser executada apenas na primeira vez ou quando o arquivo `package.json` for alterado.

## 3. Iniciar o frontend

```powershell
npm run dev
```

O terminal deverá mostrar um endereço semelhante a:

```text
Local: http://localhost:5173/
```

Abra no navegador:

```text
http://localhost:5173
```

Não feche o terminal enquanto estiver utilizando o sistema.

---

# Próximas execuções

Depois que as dependências já estiverem instaladas, execute somente:

```powershell
npm run dev
```

---

# Conexão com o backend

O frontend envia as solicitações para:

```text
http://localhost:5000/api
```

Antes de abrir o site, confirme que o backend está rodando. O teste abaixo deve retornar `status: ok`:

```text
http://127.0.0.1:5000/api/health
```

O fluxo local funciona assim:

```text
Navegador
   ↓
React — http://localhost:5173
   ↓
Flask — http://localhost:5000/api
   ↓
MongoDB Atlas
```

O frontend não acessa o MongoDB diretamente. Toda leitura ou alteração de dados passa pela API Flask.

## Arquivo `.env` do frontend

Para a configuração local atual, não é necessário criar um `.env` no frontend. O endereço `http://localhost:5000/api` já é utilizado como padrão.

Se futuramente a API for publicada em outro endereço, crie um arquivo `.env` dentro de `Return_Tech_Frontend`:

```env
VITE_API_URL=https://endereco-da-api/api
```

Depois de modificar esse arquivo, pare o Vite com `Ctrl + C` e execute novamente:

```powershell
npm run dev
```

Nunca envie um `.env` para o GitHub.

---

# Ordem para iniciar o sistema completo

São necessários dois terminais.

## Terminal 1 — Backend

Dentro de `Return_Tech_Backend`:

```powershell
.venv\Scripts\Activate.ps1
python run.py
```

## Terminal 2 — Frontend

Dentro de `Return_Tech_Frontend`:

```powershell
npm run dev
```

Depois, acesse:

```text
http://localhost:5173
```

O banco está no MongoDB Atlas. Portanto, o frontend não utiliza Docker e não é necessário executar `docker compose up -d`.

---

# Como testar o fluxo completo

1. Acesse a tela inicial.
2. Escolha o perfil **Empresa**.
3. Crie uma conta e publique um desafio.
4. Abra uma janela anônima do navegador.
5. Escolha **Estudante/Profissional**.
6. Crie outra conta e participe do desafio.
7. Envie uma solução.
8. Volte para a conta da empresa.
9. Avalie a entrega e adicione o participante à shortlist, se desejar.

A janela anônima permite manter as duas contas conectadas simultaneamente.

---

# Como encerrar

No terminal do React, pressione:

```text
Ctrl + C
```

Isso encerra apenas o frontend. O MongoDB Atlas não precisa ser desligado.

---

# Problemas comuns

## O comando `npm` não é reconhecido

O Node.js não está instalado ou o terminal ainda não reconheceu a instalação.

Instale o Node.js e reinicie o VS Code.

## O frontend não abre

Execute:

```powershell
npm install
npm run dev
```

Confirme se o terminal mostra:

```text
Local: http://localhost:5173/
```

## A porta 5173 já está ocupada

O Vite pode selecionar outra porta automaticamente. Utilize o endereço exibido no terminal.

Se o frontend abrir em outra porta, o backend pode precisar autorizar esse endereço na configuração de CORS.

## O site abre, mas cadastro, login ou dados não funcionam

Confirme se:

- o backend está rodando;
- `http://127.0.0.1:5000/api/health` retorna `status: ok`;
- o frontend foi aberto em `http://localhost:5173`;
- o terminal do backend não mostra erros de conexão com o Atlas.

## Erro ao instalar dependências

Exclua apenas a pasta `node_modules` e execute novamente:

```powershell
npm install
```

Não execute `npm audit fix --force` sem revisar as alterações, pois esse comando pode instalar versões incompatíveis e quebrar o projeto.

---

# Arquivos que não devem ir para o GitHub

Confirme que o `.gitignore` contém:

```gitignore
node_modules/
dist/
.env
.DS_Store
```

A pasta `node_modules` é recriada com `npm install` e não deve ser enviada ao repositório.

---

# Estado atual

Este frontend faz parte de um MVP funcional para desenvolvimento e testes locais. O React ainda precisa ser iniciado no computador com `npm run dev`.

Para disponibilizar o sistema publicamente, será necessário hospedar o frontend e configurar `VITE_API_URL` com o endereço público do backend.


## Enunciados e administração dos CTFs

- Na conta da empresa, use **Publicar desafio** para digitar o enunciado,
  entregáveis, competências e prazo. Ao salvar o rascunho, use o link exibido
  no formulário para abrir a página do desafio e publicá-lo.
- Cada desafio tem uma página em `/#/desafios/<id>`, acessível pelo botão
  **Ver desafio** e pelo link na tela de envio de soluções. O enunciado
  preserva as quebras de linha digitadas.
- A área do talento mostra os desafios publicados pelas empresas junto com os
  exemplos fictícios já existentes. As participações e os envios dos exemplos
  continuam salvos apenas no navegador; os desafios das empresas usam a API.
- A administração do grupo fica em `/#/admin`, com conta de perfil `admin`.
  Empresas e talentos não têm acesso ao painel. Consulte o README do backend
  para criar as contas administrativas pelo comando `create-admin`.
- O painel administrativo permite buscar, filtrar, editar enunciados e
  administrar a publicação dos desafios de todas as empresas.

Essas telas reutilizam os componentes, as cores e os estilos da aplicação.

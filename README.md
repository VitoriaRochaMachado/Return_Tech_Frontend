# Return Tech — Frontend React

Interface web da Return Tech, plataforma que conecta empresas a estudantes e profissionais de cibersegurança por meio de desafios técnicos e processos seletivos baseados em evidências práticas.

Este repositório contém somente o **frontend**. A API Flask está no projeto `Return_Tech_Backend`.

## Acesso do professor — ambiente pronto

**Abra o projeto no navegador: [Return Tech](https://min-parties-blair-confirmed.trycloudflare.com/).**

O professor utiliza a aplicação já hospedada. Não precisa clonar os repositórios,
instalar dependências, iniciar um servidor, configurar a AWS ou receber arquivos
`.env` e chaves `.pem`.

1. Na página inicial, escolha **Estudante / Profissional** ou **Empresa**.
2. Entre com uma conta existente ou use **Criar conta** no próprio site. Para
   verificar emails, cadastre um endereço de email real ao qual tenha acesso.
3. A [Administração](https://min-parties-blair-confirmed.trycloudflare.com/#/admin) utiliza uma conta administrativa já cadastrada.
   Solicite suas credenciais ao autor por um canal privado. Senhas administrativas
   não são publicadas neste README.

Como estudante/profissional, é possível participar de desafios publicados, enviar
respostas e consultar o **Portfólio**. Como empresa, é possível criar desafios de
relatório ou código, acompanhar **Avaliações** e selecionar perfis na **Shortlist**.
Novos desafios ficam disponíveis aos participantes depois da aprovação administrativa.

**Disponibilidade:** o site e a API estão na EC2; o MongoDB está no Atlas. O
Judge0 roda no computador do autor, ligado à EC2 por um túnel SSH. Para avaliar
a correção automática de código, combine um horário com o autor e confirme que
o computador, a VM Judge0 e o túnel estão ligados. O professor não precisa executar
o Judge0 no próprio computador.

**Link temporário:** o endereço HTTPS utiliza um Cloudflare Quick Tunnel e pode
mudar se esse túnel reiniciar. Se o link não abrir, solicite o endereço atualizado
ao autor. A equipe deve atualizar este link nos READMEs quando houver mudança.

`localhost` aponta para o computador de quem abre o navegador. Ele é usado apenas
na apresentação local; para acesso remoto, use o link HTTPS acima.

As seções de instalação, execução local e deploy abaixo são destinadas à equipe
de desenvolvimento e manutenção.

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

## Requisitos para desenvolvimento local

Antes de começar, instale:

- Node.js 24 LTS (24.15 ou superior nessa linha);
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

Não é necessário criar um `.env` no frontend. Em desenvolvimento, o endereço `http://localhost:5000/api` é utilizado como padrão. No build de produção, o padrão é `/api`, no mesmo servidor que entrega o site.

Se futuramente a API for publicada em outro endereço, crie um arquivo `.env` dentro de `Return_Tech_Frontend`:

```env
VITE_API_URL=https://endereco-da-api/api
```

Depois de modificar esse arquivo, pare o Vite com `Ctrl + C` e execute novamente:

```powershell
npm run dev
```

No site publicado, gere um novo build depois de alterar `VITE_API_URL`: o Vite incorpora esse valor aos arquivos do frontend. O arquivo `.env.example` mostra as opções sem credenciais.

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
3. Crie uma conta, cadastre o enunciado e envie o desafio para aprovação.
4. Entre com uma conta de administrador e aprove a publicação.
5. Abra uma janela anônima do navegador.
6. Escolha **Estudante/Profissional**.
7. Crie outra conta e participe do desafio aprovado.
8. Envie uma solução.
9. Volte para a conta da empresa.
10. Avalie a entrega e adicione o participante à shortlist, se desejar.

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

# Publicação no EC2 com Nginx

O frontend e o backend podem compartilhar o mesmo endereço público. O Nginx entrega os arquivos estáticos do frontend e encaminha `/api/` para o Gunicorn em `127.0.0.1:8000`.

Na pasta do frontend no Ubuntu, gere o build:

```bash
npm ci
VITE_API_URL=/api npm run build
```

A variável definida nesse comando garante o uso de `/api` mesmo se houver um `.env` antigo configurado para localhost. Publique o conteúdo de `dist/` na pasta estática do Nginx, por exemplo `/var/www/returntech`. O servidor de desenvolvimento do Vite não precisa permanecer aberto.

No site do Nginx que usa essa pasta como `root`, configure:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

O `proxy_pass` acima preserva o prefixo `/api`. As rotas da aplicação usam hash, como `/#/talentos` e `/#/desafios/<id>`, e continuam funcionando no endereço público. A configuração padrão de `base` do Vite já atende à publicação na raiz do site.

Depois de publicar, `/api/health` deve responder pela mesma origem que entrega o frontend. O limite de upload do Nginx deve comportar os arquivos permitidos pelo backend.

Referências: [variáveis e modos do Vite](https://vite.dev/guide/env-and-mode) e [proxy_pass do Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).


## Enunciados e administração dos CTFs

- Na conta da empresa, use **Criar desafio** para digitar o enunciado,
  entregáveis, competências e prazo. Ao salvar o rascunho, use o link exibido
  no formulário para abrir a página do desafio e **Enviar para aprovação**.
  Ele só aparece para os talentos após o administrador aprovar.
- Cada desafio tem uma página em `/#/desafios/<id>`, acessível pelo botão
  **Ver desafio** e pelo link na tela de envio de soluções. O enunciado
  preserva as quebras de linha digitadas.
- A área do talento mostra os desafios publicados. Inscrições e entregas usam a
  API e ficam salvas no banco. Respostas por texto, link, arquivo e código aparecem
  no Portfólio do participante. Entregas antigas salvas no navegador são importadas
  automaticamente para o banco quando o respectivo participante acessa o site.
- A administração do grupo fica em `/#/admin`, com conta de perfil `admin`.
  Empresas e talentos não têm acesso ao painel. Consulte o README do backend
  para criar as contas administrativas pelo comando `create-admin`.
- O painel administrativo permite buscar, filtrar, editar enunciados e
  administrar a publicação dos desafios de todas as empresas.

Essas telas reutilizam os componentes, as cores e os estilos da aplicação.


## Aprovação antes da publicação

1. A empresa cadastra o enunciado como rascunho e clica em **Enviar para aprovação**.
2. O desafio fica como **Aguardando aprovação**, visível somente à empresa e à administração.
3. Em `/#/admin`, use o filtro **Aguardando aprovação** e abra **Revisar desafio**.
4. Leia o enunciado e escolha **Aprovar e publicar** ou **Solicitar ajustes**.
   Ao solicitar ajustes, informe o motivo; a empresa pode corrigir e reenviar.
5. Depois da aprovação, o desafio aparece na área dos talentos.

Se a empresa alterar um enunciado já publicado ou em análise, ele volta a rascunho
e precisa ser reenviado. Salvar sem mudar os campos não retira a aprovação.
Desafios publicados continuam disponíveis conforme o prazo e o estado de cada processo.

## Avaliação automática de código com Judge0

Os desafios podem receber uma avaliação por código, com linguagens, um
exemplo público e casos privados cadastrados pela empresa. Esse fluxo utiliza
**React → API Flask → Judge0**. O frontend continua acessando somente a API Flask;
as credenciais do executor ficam no `.env` do backend.

### Iniciar o ambiente local

Depois de preparar a VM Ubuntu descrita no README do backend, mantenha o Judge0
ligado. No computador Windows:

```powershell
multipass start returntech-judge0
multipass exec returntech-judge0 -- sudo docker compose -f /home/ubuntu/judge0-v1.13.1/docker-compose.yml up -d
```

O endereço `http://127.0.0.1:2358` precisa encaminhar para o IP atual dessa VM.
Inicie o encaminhamento local disponibilizado para o projeto e mantenha seu
terminal aberto. Consulte o README do backend para configurar o token e o acesso
ao Judge0; nenhum token deve ser colocado em uma variável `VITE_*`.

Mantenha três processos do projeto em execução:

| Pasta | Comando no Windows |
| --- | --- |
| `Return_Tech_Backend` | `.\.venv\Scripts\python.exe run.py` |
| `Return_Tech_Backend` | `.\.venv\Scripts\python.exe -m flask --app run process-code-jobs --watch` |
| `Return_Tech_Frontend` | `npm run dev` |

O processo da fila acompanha as correções mesmo quando o candidato fecha o editor.
Para a instalação inicial ou após mudanças no arquivo de dependências, execute
`npm ci` no frontend.

### Empresa e administração

1. Em **Criar desafio**, selecione **Código com correção automática (Judge0)** no
   campo **Tipo de desafio**.
2. Preencha o enunciado, linguagens, pontuação, exemplo público e casos privados
   nos campos do formulário. Clique em **Salvar como rascunho**.
3. Abra o link do desafio salvo e use **Enviar para aprovação**.
4. A administração revisa o enunciado e a avaliação e escolhe **Aprovar e publicar**
   ou **Solicitar ajustes**.
5. As resoluções recebidas, seus autores e notas aparecem em **Avaliações**.
   Use **Adicionar à shortlist** para reunir o perfil do participante na **Shortlist**.

Para editar a avaliação de um rascunho existente sem tentativas, a empresa
responsável também pode usar **Configurar código**.

### Estudantes e profissionais

Após a inscrição em um desafio de código publicado, use **Abrir editor**. Escolha
a linguagem, escreva o programa e clique em **Enviar solução**. O exemplo é somente
leitura; as entradas e saídas dos casos privados não são mostradas ao candidato.

A pontuação é proporcional ao número de casos corretos. Um reenvio com nota menor
não reduz a melhor pontuação. O editor preserva o rascunho na sessão do navegador,
separado por usuário, desafio e linguagem, e permite acompanhar correções em
andamento ou consultar resultados após o encerramento.

Nos desafios sem correção automática, o participante envia resumo, link e,
quando necessário, arquivo. A entrega pode ser editada até o prazo final ou o
encerramento. As respostas enviadas permanecem disponíveis no **Portfólio**.

### Verificação de desenvolvimento

Os testes do frontend utilizam respostas simuladas da API e não fazem envios ao
Judge0 nem ao banco da equipe:

```powershell
npm test
npm run build
```

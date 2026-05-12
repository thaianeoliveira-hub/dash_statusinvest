# Suno Revenue Dashboard

Dashboard analítico interativo de receita para Suno / Status Invest.

## Funcionalidades

- **Evolução temporal** — receita por período (mensal/anual), aquisição vs renovação, ticket médio, pedidos e unidades
- **Canal & Classificação** — canal de aquisição, aquisição vs renovação, tipo de receita, fonte do pedido, canal stacked ao longo do tempo
- **Ofertas** — top ofertas por receita, tabela completa com ticket médio
- **Canal Digital** — UTM source, UTM medium, ranking de campanhas
- **Ticket** — distribuição por faixa, ticket médio por canal, oferta × ticket

## Filtros disponíveis

- Granularidade (mensal / anual)
- Ano
- Canal / Grupo
- Classificação do Comprador (Aquisição / Renovação)
- Tipo de Receita (Novo, Automática, Antecipada, Cross-sell, Padrão, Resgate)
- Fonte do Pedido (core, hotmart, etc.)
- UTM Source
- UTM Medium

## Setup local

```bash
npm install
npm start
```

Acesse em http://localhost:3000

## Deploy no Vercel

### Opção 1 — GitHub + Vercel (recomendado)

1. Faça push deste repositório para o GitHub
2. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**
3. Importe o repositório do GitHub
4. Configurações do Vercel:
   - **Framework Preset:** Create React App
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
5. Clique em **Deploy**

### Opção 2 — Vercel CLI

```bash
npm install -g vercel
vercel --prod
```

## Dados em tempo real

O dashboard lê diretamente da Google Sheet pública a cada 5 minutos.
Para mudar a fonte, edite SHEET_ID e SHEET_NAME no topo de src/App.js.

A planilha deve estar compartilhada como "Qualquer pessoa com o link pode ver".

## Estrutura do projeto

```
suno-dashboard/
├── public/
│   ├── index.html
│   └── receita_data.csv     ← dados (substituir para atualizar)
├── src/
│   ├── App.js               ← dashboard principal
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

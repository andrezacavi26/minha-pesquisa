# Minha Pesquisa

Painel para alunos de graduação (IC/TCC), mestrado e doutorado acompanharem a trajetória acadêmica e a pesquisa num lugar só.

## O que tem no MVP

- **Visão geral:** o bloco "O que eu faço hoje?" junta o que está vencido e o que vence nos próximos 7 dias. Mostra também o seu ritmo (tempo de curso decorrido comparado com a pesquisa concluída) e a próxima reunião.
- **Planejamento:** experimentos com as etapas Desenho → Coleta → Análise → Escrita (clique na etapa para mudar o status), diário de bancada, protocolos (POPs) com versão e controle de CEUA/CEP (validade e animais usados).
- **Orientação:** reuniões com pauta e decisões. As tarefas que saem de uma reunião entram direto na sua lista.
- **Prazos:** linha do tempo do curso, do ingresso à defesa, com uma agenda única de tarefas, marcos, relatórios, ética, congressos e bolsa.
- **Vida acadêmica:** orientador, bolsa, disciplinas e créditos.
- **Acervo:** artigos em kanban (ideia → publicado), congressos, certificados com total de horas, modelos e links, e geração de **texto para o Lattes**.
- **Configurações:** backup e restauração em JSON e dados de exemplo.

## Tecnologia

HTML, CSS e JavaScript (módulos ES), **sem dependências e sem etapa de build**. Os dados ficam no `localStorage` do navegador. Por isso é importante fazer backup pelas Configurações.

```
index.html
css/styles.css
js/app.js          roteador e ações
js/store.js        camada de dados (trocar por Supabase na fase 2)
js/schemas.js      formulários de cada coleção
js/metrics.js      ritmo, créditos e agenda
js/seed.js         dados de exemplo
js/views/*.js      telas
```

## Rodar localmente

Qualquer servidor estático serve:

```bash
python3 -m http.server 8000
# ou: npx serve .
```

Depois é só abrir http://localhost:8000.

## Publicar na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel, clique em **Add New → Project**, importe o repositório e escolha **Framework Preset: Other**. Não precisa de build command nem de output directory.
3. Clique em **Deploy**. A cada `git push`, a Vercel publica a nova versão sozinha.

## Próximos passos (fase 2)

- Login e sincronização entre dispositivos (Supabase: Auth + Postgres)
- Visão do orientador acompanhando vários alunos
- Anexos (certificados em PDF, banners) no Storage
- Lembretes por e-mail de prazos
- Integração com Zotero e importação do Lattes

# Missão OK: como colocar para funcionar (uns 10 minutos)

App de tarefas da família: fotos de ANTES e DEPOIS, missões com patentes e XP, prêmios (horas de PC/celular e dinheiro), Work, pedidos de permissão, chat e status online/offline.

**Endereço do app:** https://www.bravusmidia.com.br/missaook/

Se quiser só olhar antes, abra o endereço e toque em **"Abrir modo demonstração"**. Nesse modo os dados ficam só no aparelho.

---

## 1. Criar o banco grátis (Supabase)
1. Entre em https://supabase.com e clique em **New project**. Nome: `missaook`. Crie uma senha do banco e escolha a região (pode ser *South America (São Paulo)*).
   - Use um projeto **só para o Missão OK**. Não use o do Bravus Work: o filho vai ter login, e os dados da agência têm que ficar separados.
   - Se o Supabase avisar que você chegou ao limite de projetos grátis, pause um projeto que não usa ou crie com outro e-mail.
2. No menu da esquerda, abra **SQL Editor** e clique em **New query**. Cole **todo** o conteúdo do arquivo `supabase.sql` e clique em **RUN**. Tem que aparecer "Success".
3. Vá em **Authentication → Sign In / Providers → Email**, **desligue "Confirm email"** e salve. Sem isso, o login do filho por PIN não funciona.
4. Vá em **Project Settings → API** (ou *Data API / API Keys*) e copie:
   - **Project URL** (`https://xxxx.supabase.co`)
   - Chave **anon public**

## 2. Entrar como Pai
1. No seu celular, abra **https://www.bravusmidia.com.br/missaook/**
2. Cole a URL e a chave e toque em **Conectar**.
3. Toque em **Criar conta do Pai** e informe nome, e-mail e senha.
4. As tarefas do Henrique já vêm cadastradas: quarto, guarda-roupa, mesa, afastar a cama, varrer, pano, louça, lixo, banheiro (sábado), estudo e dever. Também vêm 2 trabalhos de exemplo e 5 missões. Edite tudo do seu jeito. O Lorenzo aparece só com o nome, sem tarefas.
5. Instale o app: no Chrome, menu ⋮ → **Instalar app**.

## 3. Liberar o Henrique
1. Vá em **Mais → Filhos e acessos → ⚙️ do Henrique**. Ali você também define as horas de computador e de celular do prêmio.
2. Crie um **PIN de 6 números** e toque em **Criar acesso**.
3. Toque em **Enviar link pelo WhatsApp**. O link já vai com a conexão; ele não precisa digitar nada técnico.
4. O Henrique abre o link no **Chrome** (no PC ou no celular), instala (⋮ → Instalar app, ou o ícone ⊕ na barra de endereço do PC), toca no nome dele e digita o PIN.
5. Peça para ele tocar em **Mais → Ativar notificações** e **Mais → Pôr lembretes na agenda**.

---

## Como funciona
- **Tarefa:** ele tira a foto ANTES, faz a tarefa, tira a foto DEPOIS e toca em **Marcar como feita**. O botão só libera com as duas fotos, e o card fica verde. Cada foto sai carimbada com data, hora e nome da tarefa. A câmera abre direto, então ele não consegue mandar foto antiga da galeria.
- **Liberação:** quando todas as tarefas obrigatórias do dia ficam verdes, a tela mostra **LIBERADO** com as horas de PC e celular, e você recebe a mensagem "Terminei todas as tarefas de hoje".
- **Você aprova ou manda refazer:** no Painel, você vê as fotos e toca em ⭐ Aprovar ou 🔁 Refazer (com o motivo). Se marcar "Só liberar depois que eu aprovar" no ⚙️ do filho, a liberação espera a sua aprovação.
- **Work:** trabalhos que valem dinheiro (R$). O saldo a receber soma sozinho. Quando pagar, toque em **Registrar pagamento**.
- **Missões:** metas como "7 dias seguidos" ou "30 tarefas de casa", com prêmio, dinheiro e XP. O XP sobe a patente (Recruta → Soldado → Cabo … → Brigadeiro).
- **Permissão:** o filho não edita nada. Ele toca em **Pedir permissão**, aparece um pop-up na sua tela e você autoriza por 30 min, 1 h, 3 h ou até o fim do dia, ou nega. Essa regra é garantida pelo banco de dados, não só pela tela.
- **Chat e online:** bolinha verde quando o outro está com o app aberto e cinza quando está offline (com o horário em que foi visto pela última vez).

## Limites (para não ter surpresa)
- **Bloqueio de verdade do PC/celular:** um app de navegador não consegue travar o Windows ou o Android. O Missão OK mostra BLOQUEADO/LIBERADO e te avisa. Para travar de fato, use junto o **Google Family Link** (celular) e o **Microsoft Family Safety** (PC), ambos grátis, e libere por lá quando chegar o aviso. No app, veja **Mais → Como bloquear o PC/celular de verdade**.
- **Notificações:** chegam com o app aberto ou em segundo plano. Para tocar mesmo com tudo fechado, use **Lembretes na agenda**, que cria um evento com alerta para cada tarefa no horário dela. Para tocar como despertador, crie alarmes no app Relógio com os mesmos horários.
- **Trocar o PIN depois:** ⚙️ do filho → Trocar PIN.

Desenvolvido por Andrade

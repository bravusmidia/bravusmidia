"""Teste automático do Bravus Work (smoke test).

Roda o app no modo local (sem Supabase), com dados de exemplo, e confere:
  - todas as telas abrem sem erro de JavaScript, como admin e como comercial;
  - fluxos críticos: bloquear/liberar horário com motivo, abrir horário extra.
Uso:  python3 tests/smoke.py        (precisa de: pip install playwright && playwright install chromium)
Sai com código 1 se algo falhar.
"""
import json, sys, threading, functools, http.server, socketserver, datetime, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
PORT = 8799
ROUTES = ['painel', 'clientes', 'financeiro', 'agenda', 'reunioes', 'contratos', 'metas', 'conteudo', 'equipe', 'alertas', 'ajustes']

def serve():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Q, directory=str(ROOT))
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', PORT), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def seed():
    t = datetime.date.today(); d = lambda n: (t + datetime.timedelta(days=n)).isoformat()
    return {
        'profiles': [
            {'id': 'u-adm', 'name': 'Andrade', 'role': 'admin', 'email': 'adm@teste.local', 'color': '#2f7bff'},
            {'id': 'u-com', 'name': 'Priscila', 'role': 'comercial', 'email': 'com@teste.local', 'color': '#b44cff'},
        ],
        'clients': [{'id': 'c1', 'name': 'Cliente Teste', 'contract_value': 900, 'due_day': 10, 'status': 'ativo', 'services': ['trafego']}],
        'tasks': [{'id': 'm1', 'title': 'Reunião', 'kind': 'reuniao', 'date': d(0), 'time': '18:30', 'status': 'pendente', 'company': 'Empresa X', 'assignee': 'u-adm', 'meet_type': 'comercial'},
                  {'id': 'm2', 'title': 'Reunião', 'kind': 'reuniao', 'date': d(-3), 'time': '19:30', 'status': 'noshow', 'company': 'Faltou Ltda', 'phone': '85999990000', 'assignee': 'u-adm', 'meet_type': 'comercial'},
                  {'id': 'm3', 'title': 'Reunião', 'kind': 'reuniao', 'date': d(-2), 'time': '20:30', 'status': 'feito', 'outcome': 'fechou', 'company': 'Fechou SA', 'assignee': 'u-adm', 'meet_type': 'comercial'}],
        'invoices': [], 'expenses': [], 'campaigns': [], 'content': [], 'messages': [], 'notifications': [],
        'activity': [], 'settings': [{'id': 'main', 'data': {}}], 'reminders': [], 'documents': [],
    }

def run():
    srv = serve(); fails = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for who in ['u-adm', 'u-com']:
            ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
            ctx.route('**/config.js', lambda r: r.fulfill(content_type='application/javascript', body='window.BW_CONFIG={};'))
            ctx.add_init_script(f"if(!sessionStorage.getItem('seeded')){{localStorage.clear();localStorage.setItem('bw_local_v1',{json.dumps(json.dumps(seed()))});localStorage.setItem('bw_session','{who}');sessionStorage.setItem('seeded','1')}}")
            pg = ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
            pg.goto(f'http://127.0.0.1:{PORT}/index.html#painel'); pg.wait_for_selector('#view', timeout=15000)
            if not pg.evaluate("typeof (window.supabase||{}).createClient === 'function'"): fails.append('biblioteca do Supabase (vendor) não carregou')
            for r in ROUTES:
                pg.evaluate(f"location.hash='#{r}'"); pg.wait_for_timeout(350)
                if 'Erro ao montar a tela' in pg.inner_text('#view'): fails.append(f'[{who}] tela {r}: erro ao montar')
            if who == 'u-adm':
                pg.evaluate("location.hash='#reunioes'"); pg.wait_for_timeout(300)
                if pg.locator('[data-act=weekToggle]').first.inner_text().strip().startswith('Horários') or pg.locator('.wk-card').count() == 0:
                    pg.locator('[data-act=weekToggle]').first.click(); pg.wait_for_timeout(200)
                slot = pg.locator('.slot.free[data-act=slotSheet]').first
                if slot.count() == 0: fails.append('reuniões: nenhum horário livre para testar')
                else:
                    t = slot.get_attribute('data-t'); slot.click(); pg.wait_for_selector('form[data-form=availSave]')
                    pg.locator('form[data-form=availSave] button.bad').click(); pg.wait_for_timeout(200)
                    if pg.locator('.mo-alert').count() == 0: fails.append('bloqueio sem motivo foi aceito')
                    pg.select_option('select[name=why]', 'Compromisso pessoal'); pg.locator('form[data-form=availSave] button.bad').click(); pg.wait_for_timeout(500)
                    if pg.locator(f'.slot.closed[data-t="{t}"]').count() == 0: fails.append('bloqueio com motivo não aplicou')
                    pg.locator(f'.slot.closed[data-t="{t}"]').first.click(); pg.wait_for_selector('form[data-form=availSave]')
                    pg.select_option('select[name=why]', 'Outro motivo'); pg.locator('form[data-form=availSave] button.ok').click(); pg.wait_for_timeout(200)
                    if pg.locator('.mo-alert').count() == 0: fails.append('"Outro motivo" sem observação foi aceito')
                    pg.fill('textarea[name=obs]', 'teste automático'); pg.locator('form[data-form=availSave] button.ok').click(); pg.wait_for_timeout(500)
                    if pg.locator(f'.slot.free[data-t="{t}"]').count() == 0: fails.append('liberar horário não aplicou')
                    pg.locator('[data-act=availLog]').click(); pg.wait_for_timeout(200)
                    if pg.locator('.av-log li').count() < 2: fails.append('histórico não registrou as alterações')
                    pg.locator('[data-act=closeModal]').first.click()
            if who == 'u-adm':
                pg.evaluate("location.hash='#painel'"); pg.wait_for_timeout(200); pg.evaluate("location.hash='#reunioes'"); pg.wait_for_timeout(400)
                if pg.locator('.fn-row').count() != 3: fails.append('funil do mês não apareceu')
                pg.locator('[data-act=rpTab][data-id=noshow]').click(); pg.wait_for_timeout(300)
                if 'Faltou Ltda' not in pg.inner_text('.rp-box'): fails.append('reprospecção: faltante não listado')
                else:
                    pg.locator('.rp-row [data-act=rpWhen]').first.click(); pg.wait_for_selector('form[data-form=rpSave]')
                    pg.locator('[data-act=rpQuick]').nth(1).click(); pg.locator('form[data-form=rpSave] button.pri').click(); pg.wait_for_timeout(600)
                    if 'prospectar em' not in pg.inner_text('.rp-box'): fails.append('reprospecção: data não salvou')
            fails += [f'[{who}] JS: {e}' for e in errs]
            ctx.close()
        b.close()
    srv.shutdown()
    if fails:
        print('FALHOU:'); [print(' -', f) for f in fails]; sys.exit(1)
    print(f'OK — {len(ROUTES)} telas x 2 perfis + fluxo de horários sem erros')

if __name__ == '__main__':
    run()

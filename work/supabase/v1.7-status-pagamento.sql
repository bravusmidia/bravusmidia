-- Bravus Work v1.7: status manual de pagamento (a receber / em atraso)
alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check check (status in ('pendente','pago','cancelado','atrasado','areceber'));

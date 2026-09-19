-- Fiado, paso 1 de 3. Este archivo va SOLO — ejecútalo en el SQL Editor
-- por separado, antes de correr 0027 o 0028. Postgres no permite usar un
-- valor de enum recién agregado en la misma transacción en que se agregó
-- (exactamente el tipo de error de secuenciación que causó los bugs de
-- report_profit_margin y open_cash_session esta sesión) — si esto se
-- pega junto con 0027/0028 en una sola ejecución, va a fallar.
alter type payment_method add value 'fiado';

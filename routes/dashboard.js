const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', (req, res) => {
  const clienteId = req.user.clienteId;
  const hoje = new Date().toISOString().split('T')[0];
  const mesAtual = String(new Date().getMonth() + 1).padStart(2, '0');
  const anoAtual = new Date().getFullYear();

  const aPagarPendente = db.prepare(`SELECT COALESCE(SUM(valor),0) as total FROM contas_pagar WHERE status='pendente' AND cliente_id=?`).get(clienteId);
  const aPagarAtrasado = db.prepare(`SELECT COALESCE(SUM(valor),0) as total FROM contas_pagar WHERE (status='atrasado' OR (status='pendente' AND data_vencimento < ?)) AND cliente_id=?`).get(hoje, clienteId);
  const aPagarPagoMes = db.prepare(`SELECT COALESCE(SUM(valor_pago),0) as total FROM contas_pagar WHERE status='pago' AND strftime('%m', data_pagamento)=? AND strftime('%Y', data_pagamento)=? AND cliente_id=?`).get(mesAtual, String(anoAtual), clienteId);

  const aReceberPendente = db.prepare(`SELECT COALESCE(SUM(valor),0) as total FROM contas_receber WHERE status='pendente' AND cliente_id=?`).get(clienteId);
  const aReceberAtrasado = db.prepare(`SELECT COALESCE(SUM(valor),0) as total FROM contas_receber WHERE (status='atrasado' OR (status='pendente' AND data_vencimento < ?)) AND cliente_id=?`).get(hoje, clienteId);
  const aReceberRecebidoMes = db.prepare(`SELECT COALESCE(SUM(valor_recebido),0) as total FROM contas_receber WHERE status='recebido' AND strftime('%m', data_recebimento)=? AND strftime('%Y', data_recebimento)=? AND cliente_id=?`).get(mesAtual, String(anoAtual), clienteId);

  const saldoDisponivel = aReceberRecebidoMes.total - aPagarPagoMes.total;

  const ultimosLancamentos = db.prepare(`
    SELECT 'pagar' as tipo, id, descricao, valor, data_vencimento, status, 'contas_pagar' as origem FROM contas_pagar WHERE cliente_id=?
    UNION ALL
    SELECT 'receber' as tipo, id, descricao, valor, data_vencimento, status, 'contas_receber' as origem FROM contas_receber WHERE cliente_id=?
    ORDER BY data_vencimento DESC LIMIT 10
  `).all(clienteId, clienteId);

  const graficoMes = [];
  for (let m = 1; m <= 12; m++) {
    const ms = String(m).padStart(2, '0');
    const desp = db.prepare(`SELECT COALESCE(SUM(valor_pago),0) as total FROM contas_pagar WHERE status='pago' AND strftime('%m', data_pagamento)=? AND strftime('%Y', data_pagamento)=? AND cliente_id=?`).get(ms, String(anoAtual), clienteId);
    const rec = db.prepare(`SELECT COALESCE(SUM(valor_recebido),0) as total FROM contas_receber WHERE status='recebido' AND strftime('%m', data_recebimento)=? AND strftime('%Y', data_recebimento)=? AND cliente_id=?`).get(ms, String(anoAtual), clienteId);
    graficoMes.push({ mes: m, despesas: desp.total, receitas: rec.total });
  }

  const recorrentesPag = db.prepare(`SELECT COUNT(*) as c FROM contas_pagar WHERE recorrente=1 AND status='pendente' AND cliente_id=?`).get(clienteId).c;
  const recorrentesRec = db.prepare(`SELECT COUNT(*) as c FROM contas_receber WHERE recorrente=1 AND status='pendente' AND cliente_id=?`).get(clienteId).c;
  const recorrentesAtivas = recorrentesPag + recorrentesRec;

  res.json({
    aPagarPendente: aPagarPendente.total,
    aPagarAtrasado: aPagarAtrasado.total,
    aPagarPagoMes: aPagarPagoMes.total,
    aReceberPendente: aReceberPendente.total,
    aReceberAtrasado: aReceberAtrasado.total,
    aReceberRecebidoMes: aReceberRecebidoMes.total,
    saldoDisponivel,
    recorrentesAtivas,
    ultimosLancamentos,
    graficoMes
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', (req, res) => {
  const { tipo } = req.query;
  const clienteId = req.user.clienteId;
  let rows;
  if (tipo) {
    rows = db.prepare('SELECT * FROM categorias WHERE (tipo = ? OR tipo = ?) AND cliente_id = ? ORDER BY nome').all(tipo, 'ambos', clienteId);
  } else {
    rows = db.prepare('SELECT * FROM categorias WHERE cliente_id = ? ORDER BY nome').all(clienteId);
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const { nome, tipo } = req.body;
  const clienteId = req.user.clienteId;
  if (!nome || !tipo) return res.status(400).json({ error: 'nome e tipo são obrigatórios' });
  try {
    const result = db.prepare('INSERT INTO categorias (nome, tipo, cliente_id) VALUES (?, ?, ?)').run(nome, tipo, clienteId);
    db.persist();
    res.status(201).json(db.prepare('SELECT * FROM categorias WHERE id = ?').get(result.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: 'Categoria já existe ou inválida' });
  }
});

router.put('/:id', (req, res) => {
  const { nome, tipo } = req.body;
  const clienteId = req.user.clienteId;
  const existing = db.prepare('SELECT * FROM categorias WHERE id = ? AND cliente_id = ?').get(req.params.id, clienteId);
  if (!existing) return res.status(404).json({ error: 'Categoria não encontrada' });
  try {
    db.prepare('UPDATE categorias SET nome=?, tipo=? WHERE id=? AND cliente_id=?').run(
      nome ?? existing.nome, tipo ?? existing.tipo, req.params.id, clienteId
    );
    db.persist();
    res.json(db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id));
  } catch (e) {
    res.status(400).json({ error: 'Nome já existe ou inválido' });
  }
});

router.delete('/:id', (req, res) => {
  const clienteId = req.user.clienteId;
  const existing = db.prepare('SELECT * FROM categorias WHERE id = ? AND cliente_id = ?').get(req.params.id, clienteId);
  if (!existing) return res.status(404).json({ error: 'Categoria não encontrada' });
  db.prepare('UPDATE contas_pagar SET categoria_id = NULL WHERE categoria_id = ? AND cliente_id = ?').run(req.params.id, clienteId);
  db.prepare('UPDATE contas_receber SET categoria_id = NULL WHERE categoria_id = ? AND cliente_id = ?').run(req.params.id, clienteId);
  db.prepare('DELETE FROM categorias WHERE id = ? AND cliente_id = ?').run(req.params.id, clienteId);
  db.persist();
  res.json({ message: 'Categoria removida' });
});

module.exports = router;

const PageAdmin = {
  currentTab: 'clientes',

  async render(container) {
    container.innerHTML = `
      <div class="card fade-in">
        <div class="card-header">
          <h3>Configurações</h3>
        </div>
        <div class="admin-tabs">
          <button class="btn ${this.currentTab === 'clientes' ? 'btn-primary' : 'btn-outline'}" onclick="PageAdmin.switchTab('clientes')">Clientes</button>
          <button class="btn ${this.currentTab === 'usuarios' ? 'btn-primary' : 'btn-outline'}" onclick="PageAdmin.switchTab('usuarios')">Usuários</button>
          <button class="btn ${this.currentTab === 'categorias' ? 'btn-primary' : 'btn-outline'}" onclick="PageAdmin.switchTab('categorias')">Categorias</button>
        </div>
        <div id="adminContent"></div>
      </div>
    `;
    this.loadTabContent();
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.admin-tabs .btn').forEach(b => {
      b.className = 'btn ' + (b.textContent.includes(tab === 'clientes' ? 'Clientes' : 'Usuários') ? 'btn-primary' : 'btn-outline');
    });
    this.loadTabContent();
  },

  async loadTabContent() {
    const el = document.getElementById('adminContent');
    if (this.currentTab === 'clientes') {
      await this.renderClientes(el);
    } else if (this.currentTab === 'categorias') {
      await this.renderCategorias(el);
    } else {
      await this.renderUsuarios(el);
    }
  },

  async renderClientes(el) {
    el.innerHTML = '<p>Carregando...</p>';
    try {
      const clientes = await API.get('/api/admin/clientes');
      el.innerHTML = `
        <div style="margin-bottom:16px">
          <button class="btn btn-primary" onclick="PageAdmin.openClienteModal()">+ Novo Cliente</button>
        </div>
        <div class="table-container">
          <table>
            <thead><tr>
              <th>ID</th><th>Nome</th><th>Domínio</th><th>Usuários</th><th>Ativo</th><th>Ações</th>
            </tr></thead>
            <tbody>
              ${clientes.map(c => `
                <tr>
                  <td>${c.id}</td>
                  <td><strong>${c.nome}</strong></td>
                  <td>${c.dominio || '-'}</td>
                  <td>${c.total_usuarios}</td>
                  <td>${c.ativo ? '<span class="badge badge-pago">Sim</span>' : '<span class="badge badge-cancelado">Não</span>'}</td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-sm btn-outline" onclick="PageAdmin.openClienteModal(${c.id})">Editar</button>
                      <button class="btn btn-sm btn-outline" onclick="PageAdmin.verUsuarios(${c.id}, '${c.nome}')">Usuários</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      el.innerHTML = `<p style="color:var(--danger)">Erro ao carregar clientes: ${e.message}</p>`;
    }
  },

  async renderUsuarios(el) {
    el.innerHTML = '<p>Carregando...</p>';
    try {
      const usuarios = await API.get('/api/admin/usuarios');
      el.innerHTML = `
        <div style="margin-bottom:16px">
          <button class="btn btn-primary" onclick="PageAdmin.openUsuarioModal()">+ Vincular Usuário</button>
        </div>
        <div class="table-container">
          <table>
            <thead><tr>
              <th>ID</th><th>Nome</th><th>Email</th><th>Cliente</th><th>Papel</th><th>Ativo</th><th>Ações</th>
            </tr></thead>
            <tbody>
              ${usuarios.map(u => `
                <tr>
                  <td>${u.id}</td>
                  <td><strong>${u.nome}</strong></td>
                  <td>${u.email}</td>
                  <td>${u.cliente_nome || '-'}</td>
                  <td><span class="badge badge-${u.papel === 'admin' ? 'info' : 'pendente'}">${u.papel}</span></td>
                  <td>${u.ativo ? '<span class="badge badge-pago">Sim</span>' : '<span class="badge badge-cancelado">Não</span>'}</td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-sm btn-outline" onclick="PageAdmin.openUsuarioModal(${u.id})">Editar</button>
                      <button class="btn btn-sm btn-danger" onclick="PageAdmin.removerUsuario(${u.id})">Remover</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      el.innerHTML = `<p style="color:var(--danger)">Erro ao carregar usuários: ${e.message}</p>`;
    }
  },

  async openClienteModal(id) {
    let cliente = null;
    if (id) {
      const clientes = await API.get('/api/admin/clientes');
      cliente = clientes.find(c => c.id === id);
    }
    App.openModal(
      cliente ? 'Editar Cliente' : 'Novo Cliente',
      `
        <div class="form-group">
          <label>Nome</label>
          <input class="form-control" id="inputClienteNome" value="${cliente ? cliente.nome : ''}" placeholder="Nome do cliente">
        </div>
        <div class="form-group">
          <label>Domínio (para associar automaticamente usuários com esse email)</label>
          <input class="form-control" id="inputClienteDominio" value="${cliente ? (cliente.dominio || '') : ''}" placeholder="ex: meudominio.com">
        </div>
      `,
      `
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="PageAdmin.salvarCliente(${id || ''})">Salvar</button>
      `
    );
  },

  async salvarCliente(id) {
    const nome = document.getElementById('inputClienteNome').value.trim();
    const dominio = document.getElementById('inputClienteDominio').value.trim();
    if (!nome) return alert('Nome é obrigatório');
    try {
      if (id) {
        await API.put(`/api/admin/clientes/${id}`, { nome, dominio: dominio || null });
      } else {
        await API.post('/api/admin/clientes', { nome, dominio: dominio || null });
      }
      App.closeModal();
      this.loadTabContent();
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  },

  async verUsuarios(id, nome) {
    try {
      const usuarios = await API.get(`/api/admin/clientes/${id}/usuarios`);
      App.openModal(
        `Usuários de ${nome}`,
        `
          <div style="margin-bottom:12px">
            <button class="btn btn-sm btn-primary" onclick="PageAdmin.openUsuarioModal(null, ${id})">+ Vincular</button>
          </div>
          <div class="table-container">
            <table>
              <thead><tr><th>Nome</th><th>Email</th><th>Papel</th><th>Ações</th></tr></thead>
              <tbody>
                ${usuarios.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">Nenhum usuário</td></tr>' :
                  usuarios.map(u => `
                    <tr>
                      <td><strong>${u.nome}</strong></td>
                      <td>${u.email}</td>
                      <td><span class="badge badge-${u.papel === 'admin' ? 'info' : 'pendente'}">${u.papel}</span></td>
                      <td><button class="btn btn-sm btn-danger" onclick="PageAdmin.desvincularUsuario(${u.id}, ${id})">Remover</button></td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
          </div>
        `,
        `<button class="btn btn-outline" onclick="App.closeModal()">Fechar</button>`
      );
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  },

  async openUsuarioModal(id, clienteIdFixo) {
    let user = null;
    if (id) {
      const users = await API.get('/api/admin/usuarios');
      user = users.find(u => u.id === id);
    }
    const clientes = await API.get('/api/admin/clientes');
    App.openModal(
      user ? 'Editar Usuário' : 'Vincular Usuário',
      `
        <div class="form-group">
          <label>Email</label>
          <input class="form-control" id="inputUserEmail" value="${user ? user.email : ''}" placeholder="email@exemplo.com" ${user ? 'readonly' : ''}>
        </div>
        <div class="form-group">
          <label>Nome</label>
          <input class="form-control" id="inputUserNome" value="${user ? user.nome : ''}" placeholder="Nome do usuário">
        </div>
        <div class="form-group">
          <label>Cliente</label>
          <select class="form-control" id="inputUserCliente">
            ${clientes.map(c => `<option value="${c.id}" ${(user && user.cliente_id === c.id) || clienteIdFixo === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Papel</label>
          <select class="form-control" id="inputUserPapel">
            <option value="usuario" ${user && user.papel === 'usuario' ? 'selected' : ''}>Usuário</option>
            <option value="admin" ${user && user.papel === 'admin' ? 'selected' : ''}>Administrador</option>
          </select>
        </div>
      `,
      `
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="PageAdmin.salvarUsuario(${id || ''})">Salvar</button>
      `
    );
  },

  async salvarUsuario(id) {
    const email = document.getElementById('inputUserEmail').value.trim();
    const nome = document.getElementById('inputUserNome').value.trim();
    const cliente_id = parseInt(document.getElementById('inputUserCliente').value);
    const papel = document.getElementById('inputUserPapel').value;
    if (!email) return alert('Email é obrigatório');
    try {
      if (id) {
        await API.put(`/api/admin/usuarios/${id}`, { nome: nome || undefined, papel, cliente_id });
      } else {
        await API.post('/api/admin/usuarios', { email, nome: nome || email.split('@')[0], cliente_id, papel });
      }
      App.closeModal();
      this.loadTabContent();
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  },

  async removerUsuario(id) {
    if (!confirm('Remover este usuário?')) return;
    try {
      await API.del(`/api/admin/usuarios/${id}`);
      this.loadTabContent();
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  },

  async desvincularUsuario(userId, clienteId) {
    if (!confirm('Remover este usuário do cliente?')) return;
    try {
      await API.del(`/api/admin/usuarios/${userId}`);
      App.closeModal();
      this.verUsuarios(clienteId, '');
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  },

  async renderCategorias(el) {
    el.innerHTML = '<p>Carregando...</p>';
    try {
      const cats = await API.get('/api/categorias');
      el.innerHTML = `
        <div style="margin-bottom:16px">
          <button class="btn btn-primary" onclick="PageAdmin.openCategoriaModal()">+ Nova Categoria</button>
        </div>
        <div class="table-container">
          <table>
            <thead><tr><th>ID</th><th>Nome</th><th>Tipo</th><th>Ações</th></tr></thead>
            <tbody>
              ${cats.map(c => `
                <tr>
                  <td>${c.id}</td>
                  <td><strong>${c.nome}</strong></td>
                  <td><span class="badge badge-${c.tipo === 'receita' ? 'success' : c.tipo === 'despesa' ? 'danger' : 'info'}">${c.tipo}</span></td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-sm btn-outline" onclick="PageAdmin.openCategoriaModal(${c.id})">Editar</button>
                      <button class="btn btn-sm btn-danger" onclick="PageAdmin.excluirCategoria(${c.id})">Excluir</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      el.innerHTML = `<p style="color:var(--danger)">Erro ao carregar categorias: ${e.message}</p>`;
    }
  },

  openCategoriaModal(id) {
    const cats = [];
    const c = id ? { nome: document.querySelector(`#adminContent table tbody tr:nth-child(${id}) td:nth-child(2)`)?.textContent, tipo: '' } : { nome: '', tipo: 'despesa' };
    App.openModal(
      id ? 'Editar Categoria' : 'Nova Categoria',
      `
        <div class="form-group">
          <label>Nome</label>
          <input class="form-control" id="inputCatNome" value="${c.nome || ''}" placeholder="Nome da categoria">
        </div>
        <div class="form-group">
          <label>Tipo</label>
          <select class="form-control" id="inputCatTipo">
            <option value="despesa" ${(!id || c.tipo === 'despesa') ? 'selected' : ''}>Despesa</option>
            <option value="receita" ${c.tipo === 'receita' ? 'selected' : ''}>Receita</option>
            <option value="ambos" ${c.tipo === 'ambos' ? 'selected' : ''}>Ambos</option>
          </select>
        </div>
      `,
      `
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="PageAdmin.salvarCategoria(${id || ''})">Salvar</button>
      `
    );
    if (id) {
      API.get('/api/categorias').then(cats => {
        const cat = cats.find(x => x.id === id);
        if (cat) {
          document.getElementById('inputCatNome').value = cat.nome;
          document.getElementById('inputCatTipo').value = cat.tipo;
        }
      });
    }
  },

  async salvarCategoria(id) {
    const nome = document.getElementById('inputCatNome').value.trim();
    const tipo = document.getElementById('inputCatTipo').value;
    if (!nome) return alert('Nome é obrigatório');
    try {
      if (id) {
        await API.put(`/api/categorias/${id}`, { nome, tipo });
      } else {
        await API.post('/api/categorias', { nome, tipo });
      }
      App.closeModal();
      this.renderCategorias(document.getElementById('adminContent'));
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  },

  async excluirCategoria(id) {
    if (!confirm('Excluir esta categoria?')) return;
    try {
      await API.del(`/api/categorias/${id}`);
      this.renderCategorias(document.getElementById('adminContent'));
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  }
};

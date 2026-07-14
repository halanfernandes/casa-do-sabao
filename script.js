/* =============================================
   CASA DO SABÃO — script.js
   ============================================= */

// ── MENU MOBILE ─────────────────────────────
const menuToggle = document.getElementById('menuToggle');
const mainNav    = document.getElementById('mainNav');

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('open');
  });
}

// ── SCROLL SUAVE ────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (mainNav) mainNav.classList.remove('open');
    }
  });
});

// ── SALVAR / CARREGAR VENDEDOR ───────────────
function salvarVendedor(nome, whatsapp) {
  localStorage.setItem('vendedoraNome', nome);
  localStorage.setItem('vendedoraWhatsApp', whatsapp);
}

function carregarVendedor() {
  return {
    nome:     localStorage.getItem('vendedoraNome')     || '',
    whatsapp: localStorage.getItem('vendedoraWhatsApp') || ''
  };
}

// ── ACORDEÃO DE CATEGORIAS ───────────────────
function toggleCategoria(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('aberta');
}

// ── SUB-ABAS DE MARCAS ───────────────────────
function trocarSubAba(grupo, aba, btnClicado) {
  const todosBtn = document.querySelectorAll(`#subabas-${grupo} .sub-aba-btn`);
  todosBtn.forEach(b => b.classList.remove('ativa'));

  const paineis = document.querySelectorAll(`[id^="painel-${grupo}-"]`);
  paineis.forEach(p => p.classList.remove('ativa'));

  btnClicado.classList.add('ativa');
  const painel = document.getElementById(`painel-${grupo}-${aba}`);
  if (painel) painel.classList.add('ativa');
}

// ── CARRINHO (estado compartilhado) ─────────
const carrinho = {};

function getPrecoProduto(card) {
  if (card.dataset.preco) return parseFloat(card.dataset.preco);
  const textoPreco = card.querySelector('.preco')?.textContent || '';
  const match = textoPreco.match(/[\d,\.]+/);
  return match ? parseFloat(match[0].replace(',', '.')) : 0;
}

function atualizarCarrinho() {
  const resumo = document.getElementById('carrinhoResumo');
  const lista  = document.getElementById('carrinhoLista');
  const total  = document.getElementById('carrinhoTotal');
  if (!resumo || !lista || !total) return;

  lista.innerHTML = '';
  let totalVal = 0;
  let temItens = false;

  Object.entries(carrinho).forEach(([nome, { qty, preco }]) => {
    if (qty > 0) {
      temItens = true;
      const subtotal = qty * preco;
      totalVal += subtotal;
      const li = document.createElement('li');
      li.innerHTML = `<span>${qty}× ${nome}</span><span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span>`;
      lista.appendChild(li);
    }
  });

  resumo.style.display = temItens ? 'block' : 'none';
  total.textContent = `R$ ${totalVal.toFixed(2).replace('.', ',')}`;
}

function inicializarCarrinho() {
  document.querySelectorAll('.product-card').forEach(card => {
    const nome     = card.dataset.produto;
    const preco    = getPrecoProduto(card);
    const qtySpan  = card.querySelector('.qty-val');
    const btnMinus = card.querySelector('.qty-btn.minus');
    const btnPlus  = card.querySelector('.qty-btn.plus');
    if (!nome || !qtySpan || !btnMinus || !btnPlus) return;

    carrinho[nome] = { qty: 0, preco };

    btnPlus.addEventListener('click', () => {
      carrinho[nome].qty++;
      qtySpan.textContent = carrinho[nome].qty;
      card.classList.add('selecionado');
      atualizarCarrinho();
    });

    btnMinus.addEventListener('click', () => {
      if (carrinho[nome].qty > 0) {
        carrinho[nome].qty--;
        qtySpan.textContent = carrinho[nome].qty;
        if (carrinho[nome].qty === 0) card.classList.remove('selecionado');
        atualizarCarrinho();
      }
    });
  });
}

function montarMensagem(nome, telefone, endereco, obs, whatsappDestino) {
  const itens = Object.entries(carrinho)
    .filter(([, { qty }]) => qty > 0)
    .map(([nome, { qty, preco }]) =>
      `  • ${qty}x ${nome} (R$ ${(qty * preco).toFixed(2).replace('.', ',')})`
    )
    .join('\n');

  if (!itens) return null;

  const vendedor = carregarVendedor();
  const destino  = whatsappDestino || vendedor.whatsapp || '5549991782851';

  let msg = `Olá! Gostaria de fazer um pedido 😊\n\n`;
  msg += `*Nome:* ${nome}\n`;
  msg += `*Endereço:* ${endereco}\n`;
  msg += `*Telefone:* ${telefone}\n`;
  if (obs && obs.trim()) msg += `*Observações:* ${obs}\n`;
  msg += `\n*Pedido:*\n${itens}`;

  return { msg, destino };
}

// ── FORMULÁRIO — PÁGINA INICIAL ─────────────
function initFormHome() {
  const btn   = document.getElementById('enviarPedidoHome');
  const aviso = document.getElementById('avisoHome');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const nome     = document.getElementById('nomeHome')?.value.trim();
    const telefone = document.getElementById('telefoneHome')?.value.trim();
    const endereco = document.getElementById('enderecoHome')?.value.trim();
    const obs      = document.getElementById('obsHome')?.value.trim();

    if (!nome || !telefone || !endereco) {
      if (aviso) aviso.textContent = 'Por favor, preencha nome, telefone e endereço.';
      return;
    }

    const result = montarMensagem(nome, telefone, endereco, obs, '5549991782851');

    if (!result) {
      if (aviso) aviso.textContent = 'Adicione pelo menos um produto ao pedido.';
      return;
    }

    if (aviso) aviso.textContent = '';
    const link = `https://api.whatsapp.com/send?phone=${result.destino}&text=${encodeURIComponent(result.msg)}`;
    window.open(link, '_blank');
  });
}

// ── FORMULÁRIO — PÁGINA DO VENDEDOR ─────────
function initFormVendedor() {
  const btn   = document.getElementById('enviarPedidoVend');
  const aviso = document.getElementById('avisoVend');
  if (!btn) return;

  const vendedor = carregarVendedor();
  const descEl   = document.getElementById('vendedoraNomeDesc');
  if (descEl && vendedor.nome) {
    descEl.textContent = `Pedido para a vendedora ${vendedor.nome}. Selecione os itens abaixo.`;
  }

  btn.addEventListener('click', () => {
    const nome     = document.getElementById('nomeVend')?.value.trim();
    const telefone = document.getElementById('telefoneVend')?.value.trim();
    const endereco = document.getElementById('enderecoVend')?.value.trim();
    const obs      = document.getElementById('obsVend')?.value.trim();

    if (!nome || !telefone || !endereco) {
      if (aviso) aviso.textContent = 'Por favor, preencha nome, telefone e endereço.';
      return;
    }

    const result = montarMensagem(nome, telefone, endereco, obs);

    if (!result) {
      if (aviso) aviso.textContent = 'Adicione pelo menos um produto ao pedido.';
      return;
    }

    if (!result.destino) {
      if (aviso) aviso.textContent = 'Vendedora não encontrada. Volte para Pontos de Venda e tente novamente.';
      return;
    }

    if (aviso) aviso.textContent = '';
    const link = `https://api.whatsapp.com/send?phone=${result.destino}&text=${encodeURIComponent(result.msg)}`;
    window.open(link, '_blank');
  });
}

// ── INICIALIZAÇÃO ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  inicializarCarrinho();
  initFormHome();
  initFormVendedor();
});
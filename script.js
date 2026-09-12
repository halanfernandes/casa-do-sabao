/* =============================================
   CASA DO SABÃO — script.js
   ============================================= */

// ── CONFIGURAÇÃO: PLANILHA DE CONTROLE DE VENDAS ──
// Depois de publicar o Google Apps Script (veja o guia que te enviei),
// cole aqui a URL do "Web app" gerada. Enquanto estiver em branco,
// o site funciona normalmente, só não grava nada na planilha.
const URL_PLANILHA =
  "https://script.google.com/macros/s/AKfycbwoNIGEYOJgeIBnsgsVCnmAubmrcSqIgtOLGxqlqKv-jmV9eaEvujdWmMc2wC6zXO3G/exec";

// ── CONFIGURAÇÃO: VENDEDORES CADASTRADOS ──────
// Cada vendedor recebe um link próprio: seusite.com/?vendedor=ID
// "whatsapp" é o número para onde o pedido desse vendedor vai (formato 55DDDNUMERO).
// Pode repetir o mesmo número da loja se quiser que todos os pedidos
// caiam sempre no seu WhatsApp principal, só mudando o nome pra identificar quem vendeu.
const NUMERO_CENTRAL = "5549991782851"; // todos os pedidos caem aqui

const VENDEDORES = {
  loja: { nome: "Casa do Sabão (Loja)", whatsapp: NUMERO_CENTRAL },
  arthur: { nome: "Arthur", whatsapp: NUMERO_CENTRAL },
  gisele: { nome: "Gisele", whatsapp: NUMERO_CENTRAL },
  // adicione novos vendedores aqui, exemplo:
  // joao: { nome: "João", whatsapp: NUMERO_CENTRAL },
};

// ── MENU MOBILE ─────────────────────────────
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    mainNav.classList.toggle("open");
  });
}

// ── SCROLL SUAVE ────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (mainNav) mainNav.classList.remove("open");
    }
  });
});

// ── SALVAR / CARREGAR VENDEDOR (usado pela página própria de cada vendedor, se existir) ──
function salvarVendedor(nome, whatsapp) {
  localStorage.setItem("vendedoraNome", nome);
  localStorage.setItem("vendedoraWhatsApp", whatsapp);
}

function carregarVendedor() {
  return {
    nome: localStorage.getItem("vendedoraNome") || "",
    whatsapp: localStorage.getItem("vendedoraWhatsApp") || "",
  };
}

// ── VENDEDOR ATUAL VIA LINK (?vendedor=ID) ───
// Se alguém abre o site com ?vendedor=halan, guardamos isso no navegador
// para que continue identificado mesmo se ele navegar por outras páginas.
function pegarVendedorAtual() {
  const params = new URLSearchParams(window.location.search);
  const idURL = params.get("vendedor");

  if (idURL && VENDEDORES[idURL]) {
    localStorage.setItem("vendedorId", idURL);
  }

  const id = localStorage.getItem("vendedorId") || "loja";
  return { id, ...(VENDEDORES[id] || VENDEDORES.loja) };
}

// ── ACORDEÃO DE CATEGORIAS ───────────────────
function toggleCategoria(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("aberta");
}

// ── SUB-ABAS DE MARCAS ───────────────────────
function trocarSubAba(grupo, aba, btnClicado) {
  const todosBtn = document.querySelectorAll(`#subabas-${grupo} .sub-aba-btn`);
  todosBtn.forEach((b) => b.classList.remove("ativa"));

  const paineis = document.querySelectorAll(`[id^="painel-${grupo}-"]`);
  paineis.forEach((p) => p.classList.remove("ativa"));

  btnClicado.classList.add("ativa");
  const painel = document.getElementById(`painel-${grupo}-${aba}`);
  if (painel) painel.classList.add("ativa");
}

// ── CARRINHO (estado compartilhado) ─────────
const carrinho = {};

function getPrecoProduto(card) {
  if (card.dataset.preco) return parseFloat(card.dataset.preco);
  const textoPreco = card.querySelector(".preco")?.textContent || "";
  const match = textoPreco.match(/[\d,\.]+/);
  return match ? parseFloat(match[0].replace(",", ".")) : 0;
}

function atualizarCarrinho() {
  const resumo = document.getElementById("carrinhoResumo");
  const lista = document.getElementById("carrinhoLista");
  const total = document.getElementById("carrinhoTotal");
  if (!resumo || !lista || !total) return;

  lista.innerHTML = "";
  let totalVal = 0;
  let temItens = false;

  Object.entries(carrinho).forEach(([nome, { qty, preco }]) => {
    if (qty > 0) {
      temItens = true;
      const subtotal = qty * preco;
      totalVal += subtotal;
      const li = document.createElement("li");
      li.innerHTML = `<span>${qty}× ${nome}</span><span>R$ ${subtotal.toFixed(2).replace(".", ",")}</span>`;
      lista.appendChild(li);
    }
  });

  resumo.style.display = temItens ? "block" : "none";
  total.textContent = `R$ ${totalVal.toFixed(2).replace(".", ",")}`;
}

function inicializarCarrinho() {
  document.querySelectorAll(".product-card").forEach((card) => {
    const nome = card.dataset.produto;
    const preco = getPrecoProduto(card);
    const qtySpan = card.querySelector(".qty-val");
    const btnMinus = card.querySelector(".qty-btn.minus");
    const btnPlus = card.querySelector(".qty-btn.plus");
    if (!nome || !qtySpan || !btnMinus || !btnPlus) return;

    carrinho[nome] = { qty: 0, preco };

    btnPlus.addEventListener("click", () => {
      carrinho[nome].qty++;
      qtySpan.textContent = carrinho[nome].qty;
      card.classList.add("selecionado");
      atualizarCarrinho();
    });

    btnMinus.addEventListener("click", () => {
      if (carrinho[nome].qty > 0) {
        carrinho[nome].qty--;
        qtySpan.textContent = carrinho[nome].qty;
        if (carrinho[nome].qty === 0) card.classList.remove("selecionado");
        atualizarCarrinho();
      }
    });
  });
}

// ── MONTA A MENSAGEM DO WHATSAPP + DADOS DO PEDIDO ──
// vendedorInfo: { nome, whatsapp } — de onde veio a venda
function montarMensagem(
  nome,
  telefone,
  endereco,
  obs,
  vendedorInfo,
  indicadoPor,
) {
  const itensDetalhados = Object.entries(carrinho)
    .filter(([, { qty }]) => qty > 0)
    .map(([nomeProd, { qty, preco }]) => ({
      nomeProd,
      qty,
      preco,
      subtotal: qty * preco,
    }));

  if (itensDetalhados.length === 0) return null;

  const itensTexto = itensDetalhados
    .map(
      (i) =>
        `  • ${i.qty}x ${i.nomeProd} (R$ ${i.subtotal.toFixed(2).replace(".", ",")})`,
    )
    .join("\n");

  const total = itensDetalhados.reduce((acc, i) => acc + i.subtotal, 0);

  const destino = (vendedorInfo && vendedorInfo.whatsapp) || "5549991782851";
  const vendedorNome =
    (vendedorInfo && vendedorInfo.nome) || "Casa do Sabão (Loja)";

  let msg = `Olá! Gostaria de fazer um pedido 😊\n\n`;
  msg += `*Nome:* ${nome}\n`;
  msg += `*Endereço:* ${endereco}\n`;
  msg += `*Telefone:* ${telefone}\n`;
  if (obs && obs.trim()) msg += `*Observações:* ${obs}\n`;
  if (indicadoPor && indicadoPor.trim())
    msg += `*Indicado por:* ${indicadoPor}\n`;
  msg += `\n*Pedido:*\n${itensTexto}`;
  msg += `\n\n*Total:* R$ ${total.toFixed(2).replace(".", ",")}`;

  return { msg, destino, vendedorNome, itensTexto, total };
}

// ── REGISTRA A VENDA NA PLANILHA GOOGLE SHEETS ──
// Não bloqueia o envio do WhatsApp mesmo se falhar (best-effort).
function registrarVendaNaPlanilha(dados) {
  if (!URL_PLANILHA || URL_PLANILHA.startsWith("COLE_AQUI")) {
    console.warn(
      "URL_PLANILHA ainda não configurada — venda não foi registrada na planilha.",
    );
    return;
  }

  fetch(URL_PLANILHA, {
    method: "POST",
    mode: "no-cors", // Apps Script não devolve cabeçalhos CORS por padrão
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(dados),
  }).catch((err) => {
    console.error("Erro ao registrar venda na planilha:", err);
  });
}

// ── FORMULÁRIO — PÁGINA INICIAL ─────────────
function initFormHome() {
  const btn = document.getElementById("enviarPedidoHome");
  const aviso = document.getElementById("avisoHome");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const nome = document.getElementById("nomeHome")?.value.trim();
    const telefone = document.getElementById("telefoneHome")?.value.trim();
    const endereco = document.getElementById("enderecoHome")?.value.trim();
    const obs = document.getElementById("obsHome")?.value.trim();
    const indicadoPor =
      document.getElementById("indicadoPor")?.value.trim() || "";

    if (!nome || !telefone || !endereco) {
      if (aviso)
        aviso.textContent = "Por favor, preencha nome, telefone e endereço.";
      return;
    }

    const vendedor = pegarVendedorAtual();
    const result = montarMensagem(
      nome,
      telefone,
      endereco,
      obs,
      vendedor,
      indicadoPor,
    );

    if (!result) {
      if (aviso)
        aviso.textContent = "Adicione pelo menos um produto ao pedido.";
      return;
    }

    if (aviso) aviso.textContent = "";

    registrarVendaNaPlanilha({
      vendedor: result.vendedorNome,
      cliente: nome,
      telefone,
      endereco,
      itens: result.itensTexto,
      total: result.total,
      observacoes: obs || "",
      indicadoPor,
    });

    const link = `https://api.whatsapp.com/send?phone=${result.destino}&text=${encodeURIComponent(result.msg)}`;
    window.open(link, "_blank");
  });
}

// ── FORMULÁRIO — PÁGINA DO VENDEDOR (caso exista uma página separada) ──
function initFormVendedor() {
  const btn = document.getElementById("enviarPedidoVend");
  const aviso = document.getElementById("avisoVend");
  if (!btn) return;

  const vendedorSalvo = carregarVendedor();
  const descEl = document.getElementById("vendedoraNomeDesc");
  if (descEl && vendedorSalvo.nome) {
    descEl.textContent = `Pedido para a vendedora ${vendedorSalvo.nome}. Selecione os itens abaixo.`;
  }

  btn.addEventListener("click", () => {
    const nome = document.getElementById("nomeVend")?.value.trim();
    const telefone = document.getElementById("telefoneVend")?.value.trim();
    const endereco = document.getElementById("enderecoVend")?.value.trim();
    const obs = document.getElementById("obsVend")?.value.trim();

    if (!nome || !telefone || !endereco) {
      if (aviso)
        aviso.textContent = "Por favor, preencha nome, telefone e endereço.";
      return;
    }

    const result = montarMensagem(nome, telefone, endereco, obs, vendedorSalvo);

    if (!result) {
      if (aviso)
        aviso.textContent = "Adicione pelo menos um produto ao pedido.";
      return;
    }

    if (!result.destino) {
      if (aviso)
        aviso.textContent =
          "Vendedora não encontrada. Volte para Pontos de Venda e tente novamente.";
      return;
    }

    if (aviso) aviso.textContent = "";

    registrarVendaNaPlanilha({
      vendedor: result.vendedorNome,
      cliente: nome,
      telefone,
      endereco,
      itens: result.itensTexto,
      total: result.total,
      observacoes: obs || "",
    });

    const link = `https://api.whatsapp.com/send?phone=${result.destino}&text=${encodeURIComponent(result.msg)}`;
    window.open(link, "_blank");
  });
}

// ── INICIALIZAÇÃO ────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  inicializarCarrinho();
  initFormHome();
  initFormVendedor();
  verificarStatusLoja();
});

// ── STATUS DE FUNCIONAMENTO (HORÁRIO DE BRASÍLIA) ──
function verificarStatusLoja() {
  const statusEl = document.getElementById("statusLoja");
  if (!statusEl) return;

  // Pega a hora atual no fuso de Brasília, independente de onde o visitante está
  const agoraBrasilia = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );

  const diaSemana = agoraBrasilia.getDay(); // 0 = domingo, 6 = sábado
  const minutosAgora =
    agoraBrasilia.getHours() * 60 + agoraBrasilia.getMinutes();

  let aberto = false;

  if (diaSemana >= 1 && diaSemana <= 5) {
    // Segunda a Sexta: 13h30 às 19h00
    const inicio = 13 * 60 + 30;
    const fim = 19 * 60;
    aberto = minutosAgora >= inicio && minutosAgora < fim;
  } else if (diaSemana === 6) {
    // Sábado: 08h30 às 12h00
    const inicio = 8 * 60 + 30;
    const fim = 12 * 60;
    aberto = minutosAgora >= inicio && minutosAgora < fim;
  }
  // Domingo (diaSemana === 0): permanece fechado

  const textoEl = statusEl.querySelector(".status-texto");

  statusEl.classList.remove("aberto", "fechado");
  if (aberto) {
    statusEl.classList.add("aberto");
    textoEl.textContent = "(ABERTO)";
  } else {
    statusEl.classList.add("fechado");
    textoEl.textContent = "(FECHADO)";
  }
}

// Atualiza a cada minuto para manter o status sempre correto
setInterval(verificarStatusLoja, 60000);

// ════════════════════════════════════════════
// 🔍 BUSCA DE PRODUTOS
// ════════════════════════════════════════════
(function () {
  const inputBusca = document.getElementById("buscaProduto");
  const btnLimpar = document.getElementById("limparBusca");
  const resultadoTexto = document.getElementById("buscaResultado");

  if (!inputBusca) return;

  let timeoutBusca = null;

  inputBusca.addEventListener("input", () => {
    clearTimeout(timeoutBusca);
    timeoutBusca = setTimeout(() => executarBusca(inputBusca.value), 200);
    btnLimpar.style.display = inputBusca.value ? "flex" : "none";
  });

  btnLimpar.addEventListener("click", () => {
    inputBusca.value = "";
    btnLimpar.style.display = "none";
    executarBusca("");
    inputBusca.focus();
  });

  function normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // remove acentos
  }

  function executarBusca(termoOriginal) {
    const termo = normalizar(termoOriginal.trim());
    const cards = document.querySelectorAll(".product-card");
    const categorias = document.querySelectorAll(".acc-categoria");
    const paineis = document.querySelectorAll(".sub-aba-painel");

    // Limpa marcações da busca anterior
    paineis.forEach((p) => p.classList.remove("busca-match"));

    // Busca vazia: volta tudo ao estado normal (fecha categorias)
    if (termo === "") {
      document.body.classList.remove("busca-ativa");
      cards.forEach((card) => (card.style.display = ""));
      categorias.forEach((cat) => cat.classList.remove("aberta"));
      resultadoTexto.textContent = "";
      resultadoTexto.classList.remove("sem-resultado");
      return;
    }

    document.body.classList.add("busca-ativa");

    let totalEncontrados = 0;
    const categoriasComResultado = new Set();

    cards.forEach((card) => {
      const nomeProduto = normalizar(card.getAttribute("data-produto") || "");
      const textoCard = normalizar(card.textContent || "");
      const encontrou =
        nomeProduto.includes(termo) || textoCard.includes(termo);

      card.style.display = encontrou ? "" : "none";

      if (encontrou) {
        totalEncontrados++;
        const painel = card.closest(".sub-aba-painel");
        const categoria = card.closest(".acc-categoria");
        if (painel) painel.classList.add("busca-match");
        if (categoria) categoriasComResultado.add(categoria);
      }
    });

    // Abre (classe "aberta") categorias com resultado, fecha as demais
    categorias.forEach((categoria) => {
      if (categoriasComResultado.has(categoria)) {
        categoria.classList.add("aberta");
      } else {
        categoria.classList.remove("aberta");
      }
    });

    if (totalEncontrados === 0) {
      resultadoTexto.textContent = `Nenhum produto encontrado para "${termoOriginal}".`;
      resultadoTexto.classList.add("sem-resultado");
    } else {
      resultadoTexto.textContent = `${totalEncontrados} produto(s) encontrado(s).`;
      resultadoTexto.classList.remove("sem-resultado");
    }
  }
})();

// ════════════════════════════════════════════
// 📲 INDIQUE UM AMIGO
// ════════════════════════════════════════════
function copiarLinkIndicacao() {
  const link = "https://halanfernandes.github.io/casa-do-sabao/"; // trocar pelo domínio quando comprar
  navigator.clipboard
    .writeText(link)
    .then(() => {
      const feedback = document.getElementById("copia-feedback");
      feedback.style.display = "inline";
      setTimeout(() => (feedback.style.display = "none"), 2000);
    })
    .catch(() => {
      alert(
        "Não foi possível copiar o link automaticamente. Copie manualmente: " +
          link,
      );
    });
}

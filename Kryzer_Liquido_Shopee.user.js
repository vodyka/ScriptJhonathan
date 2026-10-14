// ==UserScript==
// @name         Kryzer | Liquido Shopee UpSeller
// @namespace    https://github.com/vodyka/ScriptJhonathan
// @version      2.0.0
// @description  Exibe o liquido por variacao na criacao de promocoes Shopee no UpSeller.
// @match        https://app.upseller.com/pt/products/shopee/discount-promotions-create/*
// @match        https://app.upseller.com/pt/products/shopee/discount-promotions-create/
// @grant        GM_getValue
// @grant        GM_setValue
// @downloadURL  https://raw.githubusercontent.com/vodyka/ScriptJhonathan/main/Kryzer_Liquido_Shopee.user.js
// @updateURL    https://raw.githubusercontent.com/vodyka/ScriptJhonathan/main/Kryzer_Liquido_Shopee.user.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const KEY = 'kryzer-shopee-liquid-settings-v2';
  const DEFAULT = { mode: 'tiers', percent: 20, fixed: 4.50, extra: 0 };
  const settings = Object.assign({}, DEFAULT, GM_getValue(KEY, {}));
  const money = n => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(n);
  const number = value => {
    if (value == null) return NaN;
    const s = String(value).trim().replace(/\s/g, '').replace(/R\$/gi, '');
    if (!s) return NaN;
    const v = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };
  const save = () => GM_setValue(KEY, Object.assign({}, settings));
  const calculate = price => {
    let percent, fixed;
    if (settings.mode === 'manual') {
      percent = Math.max(0, number(settings.percent) || 0);
      fixed = Math.max(0, number(settings.fixed) || 0);
    } else if (price < 80) {
      percent = 20; fixed = Math.min(4.50, price / 2);
    } else if (price < 100) {
      percent = 14; fixed = 16;
    } else if (price < 200) {
      percent = 14; fixed = 20;
    } else {
      percent = 14; fixed = 26;
    }
    const commission = price * percent / 100;
    const extra = Math.max(0, number(settings.extra) || 0);
    return {commission, fixed, extra, liquid: price - commission - fixed - extra, percent};
  };

  const css = document.createElement('style');
  css.textContent = `
    .kryzer-liquid-value{display:block;white-space:nowrap;margin-top:5px;font-size:12px;font-weight:700;color:#087e4b}
    .kryzer-liquid-value.negative{color:#c42c2c}
    .kryzer-liquid-value small{font-size:10px;font-weight:400;color:#64748b;display:block}
    #kryzer-liquid-panel{position:fixed;right:18px;bottom:16px;z-index:2147483645;background:#fff;color:#172235;
      width:255px;border-radius:12px;box-shadow:0 5px 24px #0003;font:12px Arial,sans-serif;overflow:hidden;border:1px solid #cbd5e1}
    #kryzer-liquid-panel header{background:#172235;color:white;padding:12px;font-weight:bold;display:flex;justify-content:space-between;cursor:move}
    #kryzer-liquid-panel .body{padding:12px}
    #kryzer-liquid-panel label{display:block;margin:8px 0 4px;color:#475569;font-size:11px}
    #kryzer-liquid-panel input,#kryzer-liquid-panel select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;padding:7px;border-radius:5px;background:#fff;color:#172235}
    #kryzer-liquid-panel .line{display:flex;gap:8px} #kryzer-liquid-panel .line>div{flex:1;min-width:0}
    #kryzer-liquid-panel .summary{padding:9px;margin-top:10px;background:#e8f8ef;border-radius:7px;line-height:1.65}
    #kryzer-liquid-panel button{border:0;background:none;color:white;cursor:pointer}
    #kryzer-liquid-panel .note{font-size:10px;color:#64748b;margin-top:8px;line-height:1.4}
  `;
  document.head.appendChild(css);

  const panel = document.createElement('aside');
  panel.id = 'kryzer-liquid-panel';
  panel.innerHTML = `
    <header><span>💰 Kryzer • Liquido Shopee</span><button type="button" id="kryzer-toggle">−</button></header>
    <div class="body">
      <label>Regra de taxas</label>
      <select id="kryzer-mode">
        <option value="tiers">Faixas Shopee (estimativa)</option>
        <option value="manual">Personalizada</option>
      </select>
      <div class="line" id="kryzer-manual">
        <div><label>Comissao (%)</label><input id="kryzer-percent" type="number" min="0" step="0.1"></div>
        <div><label>Taxa fixa (R$)</label><input id="kryzer-fixed" type="number" min="0" step="0.01"></div>
      </div>
      <label>Outras taxas por pedido (R$)</label>
      <input id="kryzer-extra" type="number" min="0" step="0.01">
      <div class="summary" id="kryzer-status">Aguardando variacoes...</div>
      <div class="note">Liquido estimado, sem custo, imposto, Ads ou outras deducoes nao configuradas. O preco editado na tabela prevalece.</div>
    </div>
  `;
  document.body.appendChild(panel);
  const $ = id => document.getElementById(id);
  $('kryzer-mode').value = settings.mode;
  $('kryzer-percent').value = settings.percent;
  $('kryzer-fixed').value = settings.fixed;
  $('kryzer-extra').value = settings.extra;
  const applySettings = () => {
    settings.mode = $('kryzer-mode').value;
    settings.percent = $('kryzer-percent').value;
    settings.fixed = $('kryzer-fixed').value;
    settings.extra = $('kryzer-extra').value;
    $('kryzer-manual').style.display = settings.mode === 'manual' ? 'flex' : 'none';
    save();
    updateRows();
  };
  ['kryzer-mode','kryzer-percent','kryzer-fixed','kryzer-extra'].forEach(id => $(id).addEventListener('input', applySettings));
  $('kryzer-manual').style.display = settings.mode === 'manual' ? 'flex' : 'none';
  $('kryzer-toggle').addEventListener('click', () => {
    const body = panel.querySelector('.body');
    body.hidden = !body.hidden;
    $('kryzer-toggle').textContent = body.hidden ? '+' : '−';
  });

  // Preco promocional: somente a coluna "Preco com Desconto(R$)".
  // NUNCA ler o campo Nome da Promocao nem os inputs de % OFF.
  function discountColumn(table) {
    const header = [...table.querySelectorAll('thead th')];
    return header.findIndex(th => /pre[cç]o\s+com\s+desconto/i.test(th.textContent || ''));
  }
  function priceInput(cell) {
    if (!cell) return null;
    const inputs = [...cell.querySelectorAll('input:not([type=checkbox]):not([type=hidden])')];
    return inputs.find(i => i.type !== 'number' || !/%\s*off/i.test(i.parentElement?.textContent || '')) || null;
  }
  function setBadge(cell, input) {
    const price = number(input.value);
    let badge = cell.querySelector('.kryzer-liquid-value');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'kryzer-liquid-value';
      // Anexa ao proprio TD, fora do wrapper do input para nao interromper React.
      cell.appendChild(badge);
    }
    if (!(price >= 0)) {
      if (badge.textContent !== 'Digite o preco') badge.textContent = 'Digite o preco';
      return false;
    }
    const calc = calculate(price);
    const label = 'Liquido: ' + money(calc.liquid);
    const detail = 'Taxas: ' + money(calc.commission + calc.fixed + calc.extra);
    badge.classList.toggle('negative', calc.liquid < 0);
    const sig = label + '|' + detail;
    if (badge.dataset.sig !== sig) {
      badge.dataset.sig = sig;
      badge.textContent = label;
      const small = document.createElement('small');
      small.textContent = detail;
      badge.appendChild(small);
    }
    return true;
  }
  function updateRows() {
    let count = 0, foundTable = false;
    document.querySelectorAll('table').forEach(table => {
      const index = discountColumn(table);
      if (index < 0) return;
      foundTable = true;
      table.querySelectorAll('tbody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        const cell = cells[index];
        const input = priceInput(cell);
        if (input && setBadge(cell, input)) count++;
      });
    });
    $('kryzer-status').textContent = count
      ? count + ' variacao(oes) visivel(is) calculada(s). Edite o preco e o liquido muda automaticamente.'
      : foundTable ? 'Tabela encontrada; aguardando campos de preco.' : 'Aguardando tabela de promocoes...';
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; updateRows(); }, 120);
  }
  // Escuta captura: funciona mesmo com inputs dinamicos do React.
  document.addEventListener('input', schedule, true);
  document.addEventListener('change', schedule, true);
  const observer = new MutationObserver(mutations => {
    // Evitar recalcular por mudancas produzidas apenas pelos nossos indicadores.
    if (mutations.some(m => !m.target.closest?.('#kryzer-liquid-panel, .kryzer-liquid-value'))) schedule();
  });
  observer.observe(document.body, {childList:true,subtree:true});
  setInterval(updateRows, 2500);
  updateRows();
})();
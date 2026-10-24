/* my-site 쇼핑 공통 스크립트 (sample-roastery/shop.js 이식)
   장바구니 · 주문 · 재고 · 문의는 브라우저(localStorage)에 저장되는 데모입니다.
   실서비스로 갈 때는 placeOrder / addInquiry 등 아래 함수만 서버 호출로 바꾸면 됩니다.
   <html data-root="(shop 폴더까지의 상대경로)" data-site="(사이트 루트까지의 상대경로)"> 를 읽어 링크를 만듭니다. */
(function () {
  'use strict';
  var html = document.documentElement;
  var ROOT = html.getAttribute('data-root') || '';   // → shop/
  var SITE = html.getAttribute('data-site') || '';   // → 사이트 루트
  var KEY_CART = 'mysite-cart', KEY_ORDERS = 'mysite-orders', KEY_STOCK = 'mysite-stock', KEY_INQ = 'mysite-inquiries', KEY_PRODUCTS = 'mysite-products';

  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function won(n) { return Number(n || 0).toLocaleString('ko-KR') + '원'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var DATA = null;
  function data() {
    if (DATA) return DATA;
    DATA = window.SITE_DATA || null;
    if (!DATA) return null;
    // 관리자에서 수정한 제품이 있으면 덮어씀 (이 브라우저 한정)
    var edited = load(KEY_PRODUCTS, null);
    if (edited && edited.length) DATA.products = edited;
    return DATA;
  }
  function product(id) { var d = data(); if (!d) return null; for (var i = 0; i < d.products.length; i++) if (d.products[i].id === id) return d.products[i]; return null; }
  function stockOf(id) { var o = load(KEY_STOCK, {}); if (typeof o[id] === 'number') return o[id]; var p = product(id); return p ? p.stock : 0; }
  function setStock(id, n) { var o = load(KEY_STOCK, {}); o[id] = Math.max(0, n); save(KEY_STOCK, o); }
  function optionItem(group, id) { var d = data(), g = d.options && d.options[group]; if (!g) return null; for (var i = 0; i < g.items.length; i++) if (g.items[i].id === id) return g.items[i]; return null; }

  /* ---------- 장바구니 ---------- */
  var cart = load(KEY_CART, []);
  function lineKey(l) { return l.id + '|' + JSON.stringify(l.opts || {}); }
  function lineUnit(l) {
    var p = product(l.id); if (!p) return 0;
    var add = 0, o = l.opts || {};
    Object.keys(o).forEach(function (g) { var it = optionItem(g, o[g]); if (it && it.add) add += it.add; });
    return p.price + add;
  }
  function optText(l) {
    var o = l.opts || {}, t = [];
    Object.keys(o).forEach(function (g) { var it = optionItem(g, o[g]); if (it) t.push(it.name); });
    return t.join(' · ');
  }
  function add(line) {
    var l = { id: line.id, q: line.q || 1, opts: line.opts || {} };
    var k = lineKey(l), found = null;
    cart.forEach(function (x) { if (lineKey(x) === k) found = x; });
    var st = stockOf(l.id), cur = found ? found.q : 0;
    if (cur + l.q > st) { toast('재고가 ' + st + '개뿐이라 더 담을 수 없어요'); return false; }
    if (found) found.q += l.q; else cart.push(l);
    save(KEY_CART, cart); renderCart(); openCart(); return true;
  }
  function setQ(i, q) { if (q < 1) return remove(i); var st = stockOf(cart[i].id); if (q > st) { toast('재고가 ' + st + '개뿐이에요'); q = st; } cart[i].q = q; save(KEY_CART, cart); renderCart(); }
  function remove(i) { cart.splice(i, 1); save(KEY_CART, cart); renderCart(); }
  function clear() { cart = []; save(KEY_CART, cart); renderCart(); }
  function totals() {
    var d = data(), sub = 0, allFree = true;
    cart.forEach(function (l) { var p = product(l.id); sub += lineUnit(l) * l.q; if (!(p && p.freeShipping)) allFree = false; });
    var ship = (cart.length === 0 || sub >= d.brand.freeShipping || allFree) ? 0 : d.brand.shippingFee;
    return { sub: sub, ship: ship, total: sub + ship, count: cart.reduce(function (a, l) { return a + l.q; }, 0) };
  }

  function renderCart() {
    var t = totals();
    document.querySelectorAll('[data-cart-count]').forEach(function (b) { b.textContent = t.count; b.hidden = t.count === 0; });
    var body = document.querySelector('[data-cart-body]'); if (!body) return;
    var d = data();
    if (!cart.length) { body.innerHTML = '<div class="drawer-empty"><p>장바구니가 비어 있어요.</p><a class="btn sm ghost" href="' + ROOT + 'index.html">상품 보러 가기</a></div>'; }
    else {
      body.innerHTML = cart.map(function (l, i) {
        var p = product(l.id); if (!p) return '';
        return '<div class="line"><img src="' + SITE + esc(p.image) + '" alt=""><div><h4>' + esc(p.name) + '</h4><div class="opt-text">' + esc(optText(l)) + '</div>' +
          '<div class="qty"><button type="button" data-q="' + i + '" data-d="-1" aria-label="수량 줄이기">−</button><output>' + l.q + '</output><button type="button" data-q="' + i + '" data-d="1" aria-label="수량 늘리기">+</button></div></div>' +
          '<div class="line-right"><strong>' + won(lineUnit(l) * l.q) + '</strong><button type="button" class="line-remove" data-rm="' + i + '">삭제</button></div></div>';
      }).join('');
    }
    var foot = document.querySelector('[data-cart-foot]');
    if (foot) {
      var left = d.brand.freeShipping - t.sub;
      foot.innerHTML = '<div class="sum-row"><span>상품 합계</span><span>' + won(t.sub) + '</span></div>' +
        '<div class="sum-row"><span>배송비</span><span>' + (t.ship ? won(t.ship) : '무료') + '</span></div>' +
        (t.ship && left > 0 ? '<div class="ship-hint">' + won(left) + ' 더 담으면 무료배송</div>' : '') +
        '<div class="sum-row total"><span>결제 금액</span><span>' + won(t.total) + '</span></div>' +
        '<a class="btn amber block' + (cart.length ? '' : ' is-disabled') + '" href="' + ROOT + 'checkout.html">주문하기</a>';
    }
  }
  function openCart() { document.body.classList.add('cart-open'); }
  function closeCart() { document.body.classList.remove('cart-open'); }

  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------- 주문 ---------- */
  function orderNo() { var d = new Date(), pre = (data() && data().brand.orderPrefix) || 'OD'; return pre + d.getFullYear().toString().slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(); }
  function placeOrder(form) {
    var t = totals();
    var o = {
      no: orderNo(), at: new Date().toISOString(), status: 'paid',
      customer: form, items: cart.map(function (l) { var p = product(l.id); return { id: l.id, name: p.name, opt: optText(l), q: l.q, unit: lineUnit(l) }; }),
      sub: t.sub, ship: t.ship, total: t.total,
      history: [{ status: 'paid', at: new Date().toISOString() }]
    };
    cart.forEach(function (l) { setStock(l.id, stockOf(l.id) - l.q); });
    var orders = load(KEY_ORDERS, []); orders.unshift(o); save(KEY_ORDERS, orders);
    clear(); return o;
  }
  function orders() { return load(KEY_ORDERS, []); }
  function order(no) { var r = null; orders().forEach(function (o) { if (o.no === no) r = o; }); return r; }
  function setOrderStatus(no, status, memo) {
    var list = orders(); list.forEach(function (o) { if (o.no === no) { o.status = status; if (memo) o.memo = memo; o.history.push({ status: status, at: new Date().toISOString() }); } }); save(KEY_ORDERS, list);
  }
  var STATUS = { paid: '결제 완료', preparing: '상품 준비 중', shipped: '배송 중', delivered: '배송 완료', cancelled: '취소' };

  /* ---------- 문의 ---------- */
  function inquiries() { return load(KEY_INQ, []); }
  function addInquiry(q) { var l = inquiries(); q.id = 'Q' + Date.now().toString(36).toUpperCase(); q.at = new Date().toISOString(); q.status = 'open'; l.unshift(q); save(KEY_INQ, l); return q; }
  function answerInquiry(id, a) { var l = inquiries(); l.forEach(function (q) { if (q.id === id) { q.answer = a; q.status = 'done'; q.answeredAt = new Date().toISOString(); } }); save(KEY_INQ, l); }

  /* ---------- 관리자: 제품 ---------- */
  function saveProducts(list) { save(KEY_PRODUCTS, list); DATA = null; }
  function resetDemo() { [KEY_CART, KEY_ORDERS, KEY_STOCK, KEY_INQ, KEY_PRODUCTS].forEach(function (k) { localStorage.removeItem(k); }); }

  /* ---------- 공통 UI ---------- */
  function init() {
    var d = data();
    var mb = document.querySelector('.menu-btn'), nav = document.querySelector('.nav');
    if (mb && nav) mb.addEventListener('click', function () { nav.classList.toggle('is-open'); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } }); }, { threshold: .12 });
      document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    } else document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
    if (d && !document.querySelector('.drawer')) {
      var scrim = document.createElement('div'); scrim.className = 'drawer-scrim'; scrim.addEventListener('click', closeCart);
      var dr = document.createElement('aside'); dr.className = 'drawer'; dr.setAttribute('aria-label', '장바구니');
      dr.innerHTML = '<div class="drawer-head"><h2>장바구니</h2><button type="button" class="drawer-close" aria-label="닫기">×</button></div><div class="drawer-body" data-cart-body></div><div class="drawer-foot" data-cart-foot></div>';
      document.body.appendChild(scrim); document.body.appendChild(dr);
      dr.querySelector('.drawer-close').addEventListener('click', closeCart);
      dr.addEventListener('click', function (e) {
        var q = e.target.closest('[data-q]'); if (q) { var i = +q.dataset.q; setQ(i, cart[i].q + (+q.dataset.d)); }
        var rm = e.target.closest('[data-rm]'); if (rm) remove(+rm.dataset.rm);
      });
      document.querySelectorAll('[data-cart-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openCart(); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });
      renderCart();
    }
    // 카드의 '담기' 버튼 (옵션 없는 제품). button[data-add] 로 한정 — 옵션 라디오의 data-* 와 충돌 방지 (roastery 버그 수정 유지)
    document.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-add]'); if (!b) return; e.preventDefault();
      add({ id: b.dataset.add, q: 1 });
    });
    // 재고 상태를 카드에 반영 (관리자 수정·주문 차감 반영)
    document.querySelectorAll('[data-stock-for]').forEach(function (el) {
      var id = el.dataset.stockFor, st = stockOf(id), p = product(id);
      var card = el.closest('.card');
      if (st <= 0) { el.textContent = '품절 · 재입고 알림'; el.className = 'stock-note out'; if (card) { card.classList.add('is-soldout'); card.querySelectorAll('button[data-add]').forEach(function (b) { b.classList.add('is-disabled'); b.textContent = '품절'; }); } }
      else if (st <= 5) { el.textContent = st + '개 남음'; el.className = 'stock-note'; }
      else { el.textContent = (p && p.stockNote) || '바로 발송'; el.className = 'stock-note ok'; }
    });
  }

  window.SHOP = { data: data, product: product, stockOf: stockOf, setStock: setStock, optionItem: optionItem, add: add, cart: function () { return cart; }, totals: totals, clear: clear,
    placeOrder: placeOrder, orders: orders, order: order, setOrderStatus: setOrderStatus, STATUS: STATUS,
    inquiries: inquiries, addInquiry: addInquiry, answerInquiry: answerInquiry, saveProducts: saveProducts, resetDemo: resetDemo,
    won: won, esc: esc, toast: toast, openCart: openCart, closeCart: closeCart, renderCart: renderCart, optText: optText, lineUnit: lineUnit, ROOT: ROOT, SITE: SITE };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

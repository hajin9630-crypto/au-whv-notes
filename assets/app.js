/* ============================================================
   호주 워홀 개인 사이트 — 공통 스크립트
   의존성 없음. 전 페이지 공유.
   ============================================================ */
(function () {
  'use strict';

  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- 탭 ---------- */
  function initTabs(sel, panelSel, storeKey) {
    /* data-p / data-s 를 쓰는 탭만 처리한다.
       travel.html 은 data-day 기반의 자체 탭 로직을 쓰므로 여기서 건드리면 안 된다. */
    var tabs = Array.prototype.filter.call(
      document.querySelectorAll(sel),
      function (t) { return t.dataset.p || t.dataset.s; }
    );
    if (!tabs.length) return;
    var panels = document.querySelectorAll(panelSel);

    function show(id, tab) {
      tabs.forEach(function (x) { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      var target = document.getElementById(id);
      if (target) target.classList.add('active');
      if (storeKey) LS.set(storeKey, id);
      reveal(tab);
    }

    tabs.forEach(function (t) {
      var id = t.dataset.p || t.dataset.s;
      t.addEventListener('click', function () {
        show(id, t);
        /* 탭 전환은 즉시 이동한다.
           smooth 는 패널 표시/숨김으로 문서 높이가 확 바뀌는 순간과 겹쳐 취소되고,
           2,000px 를 미끄러지는 것도 오히려 어지럽다. (html{scroll-behavior:smooth} 를 덮으려면 'instant' 필요) */
        if (t.dataset.p) {
          window.scrollTo({ top: 0, behavior: 'instant' });
        } else {
          /* 서브탭은 sticky 라 화면에 남아 있다.
             아래로 스크롤한 상태에서 탭을 바꾸면 새 패널 중간이 나오므로 패널 첫 줄로 맞춘다.
             (sticky 로 붙은 바 자체의 rect 는 못 쓰고, 패널의 rect 를 기준으로 잡는다) */
          var bar = t.parentElement;
          var panel = document.getElementById(id);
          if (panel) {
            var y = panel.getBoundingClientRect().top + window.scrollY - 53 - bar.offsetHeight;
            if (window.scrollY > y) window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
          }
        }
      });
    });

    /* 탭이 넘칠 때 현재 탭이 화면 밖이면 보이도록 스크롤 */
    function reveal(t) {
      var bar = t.parentElement;
      if (bar.scrollWidth <= bar.clientWidth + 2) return;
      var l = t.offsetLeft, r = l + t.offsetWidth;
      if (l < bar.scrollLeft || r > bar.scrollLeft + bar.clientWidth) {
        bar.scrollLeft = Math.max(0, l - 16);
      }
    }

    /* 저장된 탭 복원 — 없으면 첫 탭 */
    var saved = storeKey ? LS.get(storeKey) : null;
    var restored = false;
    if (saved) {
      for (var i = 0; i < tabs.length; i++) {
        if ((tabs[i].dataset.p || tabs[i].dataset.s) === saved) { show(saved, tabs[i]); restored = true; break; }
      }
    }
    if (!restored && !document.querySelector(panelSel + '.active')) {
      show(tabs[0].dataset.p || tabs[0].dataset.s, tabs[0]);
    }
  }

  var pageKey = 'wh_tab_' + (location.pathname.split('/').pop() || 'index');
  initTabs('.tab', '.panel', pageKey);
  initTabs('.subtab', '.subpanel', pageKey + '_sub');

  /* ---------- 체크리스트 (localStorage) ---------- */
  document.querySelectorAll('.check input[data-k]').forEach(function (c) {
    var k = 'wh_' + c.dataset.k;
    if (LS.get(k) === '1') c.checked = true;
    c.addEventListener('change', function () { LS.set(k, c.checked ? '1' : '0'); });
  });

  /* ---------- ⭐ 내 정보만 보기 ---------- */
  (function () {
    var btn = document.getElementById('mineToggle');
    if (!btn) return;
    var KEY = 'wh_mine_only';

    /* ⭐ 콘텐츠가 하나도 없는 서브패널 — 필터를 켜면 빈 화면이 되므로 안내를 넣어둔다 */
    var refOnlyPanels = [];
    document.querySelectorAll('.subpanel').forEach(function (p) {
      if (p.querySelector('.mine, .always')) return;
      refOnlyPanels.push(p);
      var msg = document.createElement('div');
      msg.className = 'mineEmpty';
      msg.innerHTML = '이 탭은 <b>참고 자료만</b> 있어서 ⭐ 필터를 켜면 표시할 내용이 없습니다.' +
        '<br><button class="btn ghost" type="button" data-mineoff>⭐ 필터 끄기</button>';
      p.appendChild(msg);
      var tab = document.querySelector('.subtab[data-s="' + p.id + '"]');
      if (tab) p._tab = tab;
    });

    function apply(on) {
      document.body.classList.toggle('mine-only', on);
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.querySelector('.lbl').textContent = on ? '⭐ 내 정보만 보는 중' : '⭐ 내 정보만 보기';
      refOnlyPanels.forEach(function (p) {
        if (p._tab) p._tab.classList.toggle('dim', on);
      });
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-mineoff]')) { LS.set(KEY, '0'); apply(false); }
    });
    apply(LS.get(KEY) === '1');
    btn.addEventListener('click', function () {
      var on = !document.body.classList.contains('mine-only');
      LS.set(KEY, on ? '1' : '0');
      apply(on);
    });
  })();

  /* ---------- 목록 검색 · 주별 필터 (공장 · 농장) ----------
     두 목록이 같은 페이지에 있어 id 와 data 속성을 나눠 각각 독립으로 돌린다. */
  function initList(listId, inputId, countId, emptyId, chipAttr) {
    var list = document.getElementById(listId);
    if (!list) return;
    var input = document.getElementById(inputId);
    var chips = document.querySelectorAll('.chip[' + chipAttr + ']');
    var count = document.getElementById(countId);
    var empty = document.getElementById(emptyId);
    var rows = Array.prototype.slice.call(list.querySelectorAll('.frow'));
    var state = 'ALL';
    var key = chipAttr.replace('data-', '');

    function run() {
      var q = (input && input.value || '').trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (r) {
        var okState = state === 'ALL' || r.dataset.st === state;
        var okText = !q || r.textContent.toLowerCase().indexOf(q) > -1;
        var vis = okState && okText;
        r.style.display = vis ? '' : 'none';
        if (vis) shown++;
      });
      if (count) count.textContent = shown + '개';
      if (empty) empty.style.display = shown ? 'none' : '';
    }

    if (input) input.addEventListener('input', run);
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        chips.forEach(function (x) { x.classList.remove('active'); });
        c.classList.add('active');
        state = c.getAttribute(chipAttr);
        run();
      });
    });
    run();
  }
  initList('flist', 'fsearch', 'fcount', 'fempty', 'data-st');
  initList('flist2', 'fsearch2', 'fcount2', 'fempty2', 'data-st2');

  /* ---------- 기입란 자동 저장 ---------- */
  document.querySelectorAll('.fillin [data-f]').forEach(function (el) {
    var k = 'wh_f_' + el.dataset.f;
    var v = LS.get(k);
    if (v !== null) el.value = v;
    el.addEventListener('input', function () { LS.set(k, el.value); });
  });

  /* ---------- 맨 위로 ---------- */
  (function () {
    var btn = document.querySelector('.toTop');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      btn.classList.toggle('show', window.scrollY > 400);
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();

  /* ---------- D-day ---------- */
  (function () {
    var el = document.getElementById('dday');
    if (!el) return;
    var dep = new Date(el.dataset.depart + 'T00:00:00+09:00');
    var now = new Date();
    var days = Math.ceil((dep - now) / 86400000);
    var big = el.querySelector('.big');
    var phase = el.querySelector('.phase');

    if (days > 0) {
      big.textContent = 'D-' + days;
      phase.textContent = '출국 준비 중';
    } else if (days === 0) {
      big.textContent = 'D-DAY';
      phase.textContent = '오늘 출국';
    } else {
      var n = Math.abs(days);
      big.textContent = 'D+' + n;
      phase.textContent = n <= 7 ? '여행 중' : (n <= 100 ? '정착 중' : '세컨 진행 중');
    }
  })();
})();

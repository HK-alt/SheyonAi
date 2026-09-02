import type { ParsedTreeViz, TreeVizMode } from '@/subject/tree-viz/tree-viz-types';

const D3_CDN = 'https://unpkg.com/d3@7.9.0/dist/d3.min.js';

function escHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toInlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const LAYOUT_LABELS: Record<TreeVizMode, string> = {
  tidy: 'Tidy tree',
  treemap: 'Treemap',
  cluster: 'Cluster dendrogram',
  tangled: 'Tangled tree',
  force: 'Force-directed tree',
};

/** App-owned D3 hierarchy shells for Tools visualizations. */
export function buildTreeVizHtml(parsed: ParsedTreeViz): string {
  const payload = {
    layout: parsed.layout,
    title: parsed.title,
    goal: parsed.goal ?? '',
    caption: parsed.caption ?? '',
    root: parsed.root,
  };
  const json = toInlineJson(payload);
  const title = escHtml(parsed.title);
  const goal = escHtml(parsed.goal ?? '');
  const caption = escHtml(parsed.caption ?? 'Generated tree — teaching model.');
  const layoutLabel = escHtml(LAYOUT_LABELS[parsed.layout]);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script src="${D3_CDN}"></script>
  <style>
    :root {
      --page: #f1f5f9; --card: #ffffff; --ink: #0f172a; --muted: #64748b;
      --accent: #0f766e; --border: #e2e8f0; --link: #94a3b8;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--page); color: var(--ink);
      font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
    body { padding: 10px; min-height: 100%; -webkit-text-size-adjust: 100%; }
    .card {
      background: var(--card); border: 1px solid var(--border); border-radius: 14px;
      box-shadow: 0 1px 3px rgba(15,23,42,.08); padding: 14px 12px 12px; max-width: 980px; margin: 0 auto;
    }
    .head { display: flex; gap: 10px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; }
    h1 { margin: 0 0 4px; font-size: 18px; font-weight: 650; line-height: 1.25; }
    .badge {
      display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .02em;
      color: var(--accent); background: #ccfbf1; border-radius: 999px; padding: 3px 9px; margin-bottom: 8px;
    }
    .goal { margin: 0 0 10px; color: var(--muted); font-size: 12px; line-height: 1.45; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 6px; }
    .toolbar button {
      border: 1px solid var(--border); background: #fff; color: var(--ink);
      border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 600;
      -webkit-tap-highlight-color: transparent;
    }
    #chart { width: 100%; min-height: 360px; touch-action: none; overflow: hidden; }
    #chart svg { display: block; width: 100%; height: auto; max-width: 100%; }
    .caption { margin: 10px 0 0; color: var(--muted); font-size: 12px; line-height: 1.4; }
    .node circle, .node rect { stroke: #fff; stroke-width: 1.5px; }
    .node text { font-size: 11px; fill: var(--ink); pointer-events: none; }
    .link { fill: none; stroke: var(--link); stroke-opacity: .85; stroke-width: 1.4px; }
    .error { color: #be123c; font-size: 13px; padding: 12px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="head">
      <div>
        <div class="badge">${layoutLabel}</div>
        <h1>${title}</h1>
        ${goal ? `<p class="goal">${goal}</p>` : ''}
      </div>
      <div class="toolbar">
        <button type="button" id="btn-reset">Reset view</button>
      </div>
    </div>
    <div id="chart"></div>
    <p class="caption">${caption}</p>
  </div>
  <script>
(function () {
  var DATA = ${json};
  var host = document.getElementById('chart');
  var colors = null;

  function showError(msg) {
    host.innerHTML = '<p class="error">' + msg + '</p>';
  }

  function countLeaves(d) {
    if (!d.children || !d.children.length) return 1;
    return d.children.reduce(function (s, c) { return s + countLeaves(c); }, 0);
  }

  function chartWidth() {
    var w = host.clientWidth || (host.parentElement && host.parentElement.clientWidth) || 0;
    return Math.max(w, 280);
  }

  function render() {
    if (typeof d3 === 'undefined') {
      showError('Chart library failed to load. Open fullscreen and try again.');
      return;
    }
    colors = d3.scaleOrdinal().range([
      '#0f766e', '#1d4ed8', '#b45309', '#0369a1', '#be123c', '#15803d', '#a16207'
    ]);
    host.innerHTML = '';
    var width = chartWidth();
    var rootData = DATA.root;
    var layout = DATA.layout || 'tidy';
    var hierarchy = d3.hierarchy(rootData, function (d) { return d.children; })
      .sum(function (d) { return (d.children && d.children.length) ? 0 : (d.value > 0 ? d.value : 1); })
      .sort(function (a, b) { return (b.value || 0) - (a.value || 0); });

    if (layout === 'treemap') {
      renderTreemap(hierarchy, width);
      return;
    }
    if (layout === 'force') {
      renderForce(hierarchy, width);
      return;
    }
    if (layout === 'tangled') {
      renderTangled(hierarchy, width);
      return;
    }
    if (layout === 'cluster') {
      renderRadialOrCluster(hierarchy, width, true);
      return;
    }
    renderRadialOrCluster(hierarchy, width, false);
  }

  function renderRadialOrCluster(hierarchy, width, useCluster) {
    var leaves = hierarchy.leaves().length;
    var height = Math.max(320, leaves * 22 + 80);
    var narrow = width < 420;
    var margin = {
      top: 16,
      right: narrow ? 72 : 120,
      bottom: 16,
      left: narrow ? 36 : 52,
    };
    var innerW = Math.max(120, width - margin.left - margin.right);
    var innerH = height - margin.top - margin.bottom;
    var tree = (useCluster ? d3.cluster : d3.tree)().size([innerH, innerW]);
    tree(hierarchy);

    var svg = d3.select(host).append('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('width', width)
      .attr('height', height);
    var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    var zoom = d3.zoom().scaleExtent([0.35, 3]).on('zoom', function (event) {
      g.attr('transform', 'translate(' + (margin.left + event.transform.x) + ',' + (margin.top + event.transform.y) + ') scale(' + event.transform.k + ')');
    });
    svg.call(zoom);
    d3.select('#btn-reset').on('click', function () {
      svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });

    g.selectAll('path.link')
      .data(hierarchy.links())
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal().x(function (d) { return d.y; }).y(function (d) { return d.x; }));

    var node = g.selectAll('g.node')
      .data(hierarchy.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', function (d) { return 'translate(' + d.y + ',' + d.x + ')'; });

    node.append('circle')
      .attr('r', 4.5)
      .attr('fill', function (d) {
        return colors(d.data.group || d.depth);
      });

    node.append('text')
      .attr('dy', '0.32em')
      .attr('x', function (d) { return d.children ? -8 : 8; })
      .attr('text-anchor', function (d) { return d.children ? 'end' : 'start'; })
      .style('font-size', narrow ? '10px' : '11px')
      .text(function (d) {
        var name = d.data.name || '';
        if (narrow && name.length > 18) return name.slice(0, 16) + '…';
        return name;
      });
  }

  function renderTreemap(hierarchy, width) {
    var height = Math.max(420, Math.min(640, 48 * Math.sqrt(countLeaves(hierarchy))));
    var treemap = d3.treemap()
      .size([width, height])
      .paddingInner(3)
      .paddingTop(18)
      .round(true);
    treemap(hierarchy);

    var svg = d3.select(host).append('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('width', width)
      .attr('height', height);

    d3.select('#btn-reset').on('click', function () { render(); });

    var cell = svg.selectAll('g')
      .data(hierarchy.leaves())
      .join('g')
      .attr('transform', function (d) { return 'translate(' + d.x0 + ',' + d.y0 + ')'; });

    cell.append('rect')
      .attr('width', function (d) { return Math.max(0, d.x1 - d.x0); })
      .attr('height', function (d) { return Math.max(0, d.y1 - d.y0); })
      .attr('fill', function (d) {
        var key = (d.parent && d.parent.data && d.parent.data.name) || d.data.group || d.data.name;
        return colors(key);
      })
      .attr('opacity', 0.9)
      .attr('rx', 4);

    cell.append('text')
      .attr('x', 6)
      .attr('y', 14)
      .attr('fill', '#0f172a')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .text(function (d) {
        var w = d.x1 - d.x0;
        var h = d.y1 - d.y0;
        if (w < 36 || h < 18) return '';
        return d.data.name;
      });
  }

  function renderForce(hierarchy, width) {
    var height = 460;
    var links = hierarchy.links().map(function (d) {
      return { source: d.source, target: d.target };
    });
    var nodes = hierarchy.descendants();

    var svg = d3.select(host).append('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('width', width)
      .attr('height', height);
    var g = svg.append('g');
    var zoom = d3.zoom().scaleExtent([0.35, 3]).on('zoom', function (event) {
      g.attr('transform', event.transform);
    });
    svg.call(zoom);
    d3.select('#btn-reset').on('click', function () {
      svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });

    var simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(function (d) { return d.data.name + ':' + d.depth + ':' + (d.parent ? d.parent.data.name : ''); }).distance(56).strength(0.85))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(18));

    // Remap link ids to node objects already in the array
    links.forEach(function (l) {
      // already object refs from hierarchy.links()
    });
    simulation.force('link', d3.forceLink(hierarchy.links()).distance(function (d) {
      return 40 + 12 * (d.target.depth || 1);
    }).strength(0.9));

    var link = g.selectAll('line')
      .data(hierarchy.links())
      .join('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', 1.4);

    var node = g.selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag()
        .on('start', function (event, d) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', function (event, d) { d.fx = event.x; d.fy = event.y; })
        .on('end', function (event, d) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        }));

    node.append('circle')
      .attr('r', function (d) { return d.children ? 6 : 4.5; })
      .attr('fill', function (d) { return colors(d.data.group || d.depth); });

    node.append('text')
      .attr('x', 8)
      .attr('dy', '0.32em')
      .style('font-size', '11px')
      .text(function (d) { return d.data.name; });

    simulation.on('tick', function () {
      link
        .attr('x1', function (d) { return d.source.x; })
        .attr('y1', function (d) { return d.source.y; })
        .attr('x2', function (d) { return d.target.x; })
        .attr('y2', function (d) { return d.target.y; });
      node.attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });
  }

  function renderTangled(hierarchy, width) {
    var leaves = hierarchy.leaves().length;
    var height = Math.max(360, leaves * 26 + 60);
    var narrow = width < 420;
    var margin = {
      top: 20,
      right: narrow ? 72 : 110,
      bottom: 20,
      left: narrow ? 40 : 70,
    };
    var innerW = Math.max(120, width - margin.left - margin.right);
    var innerH = height - margin.top - margin.bottom;
    d3.cluster().size([innerH, innerW * 0.72])(hierarchy);

    var svg = d3.select(host).append('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('width', width)
      .attr('height', height);
    var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    var zoom = d3.zoom().scaleExtent([0.35, 3]).on('zoom', function (event) {
      g.attr('transform', 'translate(' + (margin.left + event.transform.x) + ',' + (margin.top + event.transform.y) + ') scale(' + event.transform.k + ')');
    });
    svg.call(zoom);
    d3.select('#btn-reset').on('click', function () {
      svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });

    hierarchy.descendants().forEach(function (d) {
      d.y = d.depth * (innerW / Math.max(1, hierarchy.height));
      if (d.data.group) d.x += (hashStr(d.data.group) % 17) - 8;
    });

    g.selectAll('path.link')
      .data(hierarchy.links())
      .join('path')
      .attr('class', 'link')
      .attr('stroke', function (d) { return colors(d.target.data.group || d.target.depth); })
      .attr('d', function (d) {
        var sx = d.source.y, sy = d.source.x, tx = d.target.y, ty = d.target.x;
        var mx = (sx + tx) / 2;
        return 'M' + sx + ',' + sy + 'C' + mx + ',' + sy + ' ' + mx + ',' + ty + ' ' + tx + ',' + ty;
      });

    var node = g.selectAll('g.node')
      .data(hierarchy.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', function (d) { return 'translate(' + d.y + ',' + d.x + ')'; });

    node.append('circle')
      .attr('r', 4.5)
      .attr('fill', function (d) { return colors(d.data.group || d.depth); });

    node.append('text')
      .attr('dy', '0.32em')
      .attr('x', function (d) { return d.children ? -8 : 8; })
      .attr('text-anchor', function (d) { return d.children ? 'end' : 'start'; })
      .style('font-size', narrow ? '10px' : '11px')
      .text(function (d) {
        var name = d.data.name || '';
        if (narrow && name.length > 18) return name.slice(0, 16) + '…';
        return name;
      });
  }

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return Math.abs(h);
  }

  function boot(attempt) {
    attempt = attempt || 0;
    if (typeof d3 === 'undefined') {
      if (attempt < 40) {
        setTimeout(function () { boot(attempt + 1); }, 50);
        return;
      }
      showError('Chart library failed to load. Check your connection and try again.');
      return;
    }
    if (chartWidth() < 40 && attempt < 40) {
      setTimeout(function () { boot(attempt + 1); }, 50);
      return;
    }
    try {
      render();
    } catch (err) {
      showError('Could not draw this chart.');
    }
  }

  boot(0);
  window.addEventListener('resize', function () {
    clearTimeout(window.__treeVizResize);
    window.__treeVizResize = setTimeout(function () {
      try { render(); } catch (e) {}
    }, 180);
  });
})();
  </script>
</body>
</html>`;
}

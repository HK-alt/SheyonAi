const MIND_ELIXIR_VERSION = '5.12.2';
const CDN = `https://cdn.jsdelivr.net/npm/mind-elixir@${MIND_ELIXIR_VERSION}`;

const THEME_LATTE = JSON.stringify({
  name: 'Latte',
  palette: ['#4968a3','#3b88c4','#4fa3d4','#2b5b84','#367fa2','#5e93b7','#4a719c','#28567d','#214e6d','#336699'],
  cssVar: {
    '--main-color': '#444446',
    '--main-bgcolor': '#ffffff',
    '--color': '#777777',
    '--bgcolor': '#f6f6f6',
    '--panel-color': '#444446',
    '--panel-bgcolor': '#ffffff',
    '--panel-border-color': '#eaeaea',
  },
});

const THEME_DARK = JSON.stringify({
  name: 'Dark',
  palette: ['#848FA0','#748BE9','#D2F9FE','#4145A5','#789AFA','#706CF4','#EF987F','#775DD5','#FCEECF','#DA7FBC'],
  cssVar: {
    '--main-color': '#ffffff',
    '--main-bgcolor': '#2d3748',
    '--color': '#cccccc',
    '--bgcolor': '#1a202c',
    '--panel-color': '#ffffff',
    '--panel-bgcolor': '#2d3748',
    '--panel-border-color': '#4a5568',
  },
});

/** Self-contained HTML shell for Mind Elixir v5 inside a React Native WebView. */
export const MIND_MAP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="${CDN}/dist/MindElixir.css" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background: transparent; }
    #map { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script type="module">
    import MindElixir from '${CDN}/dist/MindElixir.js';

    var mind = null;
    var currentTheme = 'light';

    var THEMES = {
      light: ${THEME_LATTE},
      dark: ${THEME_DARK},
    };

    function post(type, extra) {
      var payload = JSON.stringify(Object.assign({ type: type }, extra || {}));
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(payload);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, '*');
      }
    }

    function applyTheme(scheme) {
      currentTheme = scheme;
      if (mind) {
        try { mind.changeTheme(THEMES[scheme] || THEMES.light); } catch(e) {}
      }
    }

    function initMap(raw, scheme) {
      try {
        var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!data || !data.nodeData) return;

        if (scheme) currentTheme = scheme;

        if (mind) {
          mind.refresh(data);
          applyTheme(currentTheme);
          return;
        }

        var direction = typeof MindElixir.SIDE !== 'undefined' ? MindElixir.SIDE : 2;
        mind = new MindElixir({
          el: '#map',
          direction: direction,
          draggable: true,
          editable: false,
          toolBar: false,
          keypress: false,
          contextMenu: false,
          overflowHidden: false,
          theme: THEMES[currentTheme] || THEMES.light,
        });
        mind.init(data);

        mind.bus.addListener('selectNodes', function(nodes) {
          var node = nodes && nodes[0];
          if (node && node.nodeObj && node.nodeObj.topic) {
            post('nodeSelected', { topic: node.nodeObj.topic });
          }
        });

      } catch (e) {
        post('error', { message: String(e) });
      }
    }

    function handleCommand(cmd) {
      if (!mind) return;
      try {
        if (cmd === 'zoomIn') {
          mind.scaleVal = Math.min((mind.scaleVal || 1) + 0.2, 3);
          mind.scaleWithCenter(mind.scaleVal);
        } else if (cmd === 'zoomOut') {
          mind.scaleVal = Math.max((mind.scaleVal || 1) - 0.2, 0.3);
          mind.scaleWithCenter(mind.scaleVal);
        } else if (cmd === 'reset') {
          mind.toCenter();
        }
      } catch(e) {}
    }

    window.__initMindMap = function(raw, scheme) { initMap(raw, scheme); };
    window.__mindMapCommand = handleCommand;
    window.__mindMapApplyTheme = applyTheme;

    function handleMessage(event) {
      if (!event || !event.data) return;
      try {
        var msg = JSON.parse(event.data);
        if (msg && msg.type === 'init') {
          initMap(msg.data, msg.theme);
        } else if (msg && msg.type === 'setTheme') {
          applyTheme(msg.theme);
        } else if (msg && msg.type === 'command') {
          handleCommand(msg.command);
        } else {
          initMap(event.data);
        }
      } catch(e) {
        initMap(event.data);
      }
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    post('ready');
  </script>
</body>
</html>`;

export const MIND_MAP_BASE_URL = 'https://cdn.jsdelivr.net';

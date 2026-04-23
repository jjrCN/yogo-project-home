window.HELP_IMPROVE_VIDEOJS = false;

var QUANTITATIVE_METRICS = [
  {key: 'testQalign', label: 'Test Qalign', color: '#264653', better: 'higher'},
  {key: 'evalPSNR', label: 'Evaluation PSNR', color: '#e76f51', better: 'higher'},
  {key: 'evalSSIM', label: 'Evaluation SSIM', color: '#3a86ff', better: 'higher'},
  {key: 'evalLPIPS', label: 'Evaluation LPIPS', color: '#9c6644', better: 'lower'},
  {key: 'evalQalign', label: 'Evaluation Qalign', color: '#2a9d8f', better: 'higher'},
  {key: 'point', label: 'Points Num', color: '#e9c46a', better: 'lower'}
];

var QUANTITATIVE_TRACK_LABELS = {
  SSS: 'Single-Sensor Sparse Track (SSS)',
  SSD: 'Single-Sensor Dense Track (SSD)',
  MSD: 'Multi-Sensor Dense Track (MSD)'
};

var QUANTITATIVE_TRACKS = {
  SSS: [
    {method: '3DGS', point: 1.46, evalPSNR: 22.49, evalSSIM: 0.8407, evalLPIPS: 0.3375, evalQalign: 2.7290, testQalign: 2.6571},
    {method: 'AbsGS', point: 3.13, evalPSNR: 21.85, evalSSIM: 0.8214, evalLPIPS: 0.3572, evalQalign: 2.7215, testQalign: 2.6076},
    {method: 'Mip-Splatting', point: 1.04, evalPSNR: 22.87, evalSSIM: 0.8429, evalLPIPS: 0.3298, evalQalign: 2.6522, testQalign: 2.5662},
    {method: 'Scaffold-GS', point: 1.04, evalPSNR: 24.38, evalSSIM: 0.8527, evalLPIPS: 0.3158, evalQalign: 2.5800, testQalign: 2.5197},
    {method: 'Perceptual-GS', point: 3.46, evalPSNR: 22.59, evalSSIM: 0.8412, evalLPIPS: 0.3234, evalQalign: 2.8443, testQalign: 2.8226},
    {method: 'YOGO1', point: 1.76, evalPSNR: 25.83, evalSSIM: 0.8674, evalLPIPS: 0.3001, evalQalign: 3.1789, testQalign: 3.1764},
    {method: 'YOGO2', point: 3.98, evalPSNR: 25.90, evalSSIM: 0.8695, evalLPIPS: 0.2930, evalQalign: 3.2801, testQalign: 3.3053},
    {method: 'YOGO3', point: 5.83, evalPSNR: 25.92, evalSSIM: 0.8701, evalLPIPS: 0.2904, evalQalign: 3.3220, testQalign: 3.3485}
  ],
  SSD: [
    {method: '3DGS', point: 2.68, evalPSNR: 27.50, evalSSIM: 0.8812, evalLPIPS: 0.2737, evalQalign: 3.6292, testQalign: 3.6203},
    {method: 'AbsGS', point: 4.28, evalPSNR: 27.62, evalSSIM: 0.8823, evalLPIPS: 0.2700, evalQalign: 3.6376, testQalign: 3.6404},
    {method: 'YOGO1', point: 1.49, evalPSNR: 27.73, evalSSIM: 0.8870, evalLPIPS: 0.2681, evalQalign: 3.6839, testQalign: 3.7142},
    {method: 'YOGO2', point: 3.50, evalPSNR: 27.81, evalSSIM: 0.8885, evalLPIPS: 0.2645, evalQalign: 3.7380, testQalign: 3.7774},
    {method: 'YOGO3', point: 5.64, evalPSNR: 27.84, evalSSIM: 0.8891, evalLPIPS: 0.2632, evalQalign: 3.7543, testQalign: 3.7959}
  ],
  MSD: [
    {method: '3DGS', point: 3.14, evalPSNR: 27.24, evalSSIM: 0.8806, evalLPIPS: 0.2719, evalQalign: 3.6573, testQalign: 3.6763},
    {method: 'AbsGS', point: 5.33, evalPSNR: 27.34, evalSSIM: 0.8820, evalLPIPS: 0.2669, evalQalign: 3.6565, testQalign: 3.6805},
    {method: 'YOGO1', point: 1.45, evalPSNR: 27.57, evalSSIM: 0.8862, evalLPIPS: 0.2681, evalQalign: 3.6816, testQalign: 3.7771},
    {method: 'YOGO2', point: 3.45, evalPSNR: 27.63, evalSSIM: 0.8878, evalLPIPS: 0.2643, evalQalign: 3.7294, testQalign: 3.8211},
    {method: 'YOGO3', point: 5.23, evalPSNR: 27.69, evalSSIM: 0.8883, evalLPIPS: 0.2629, evalQalign: 3.7571, testQalign: 3.8426}
  ]
};

var quantitativeResizeTimer = null;
var quantitativeChartsRendered = false;

function scheduleIdleTask(callback, timeout) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, {timeout: timeout || 1200});
    return;
  }

  window.setTimeout(callback, timeout || 1200);
}

function escapeSvgText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatQuantitativeValue(metricKey, value) {
  if (metricKey === 'point') {
    return value.toFixed(2) + 'M';
  }
  if (metricKey === 'evalPSNR') {
    return value.toFixed(2);
  }
  return value.toFixed(4);
}

function normalizeQuantitativeValue(metric, value, values) {
  var minValue = Math.min.apply(null, values);
  var maxValue = Math.max.apply(null, values);

  if (maxValue === minValue) {
    return 1;
  }

  if (metric.better === 'lower') {
    return (maxValue - value) / (maxValue - minValue);
  }
  return (value - minValue) / (maxValue - minValue);
}

function renderQuantitativeTrack(containerId, trackName) {
  var container = document.getElementById(containerId);
  var track = QUANTITATIVE_TRACKS[trackName];

  if (!container || !track) {
    return;
  }

  var bounds = container.getBoundingClientRect();
  var containerWidth = Math.max(320, Math.round(bounds.width || container.clientWidth || 960));
  var metricsPerMethod = QUANTITATIVE_METRICS.length;
  var margins = {top: 62, right: 12, bottom: 54, left: 12};
  var plotHeight = track.length > 6 ? 250 : 225;
  var height = margins.top + plotHeight + margins.bottom;
  var groupGap = track.length > 6 ? 14 : 12;
  var barGap = track.length > 6 ? 4 : 3;
  var barWidth = track.length > 6 ? 13 : 16;
  var groupWidth = metricsPerMethod * barWidth + (metricsPerMethod - 1) * barGap;
  var width = Math.max(
    containerWidth,
    margins.left + margins.right + (track.length * groupWidth) + ((track.length - 1) * groupGap)
  );
  var innerWidth = width - margins.left - margins.right;
  var usedWidth = track.length * groupWidth + (track.length - 1) * groupGap;
  var startX = margins.left + Math.max(0, Math.floor((innerWidth - usedWidth) / 2));
  var baselineY = margins.top + plotHeight;
  var valueFontSize = track.length > 6 ? 8.5 : 9;
  var methodFontSize = track.length > 6 ? 10.5 : 11.5;
  var metricSeries = {};
  var svg = [];

  QUANTITATIVE_METRICS.forEach(function(metric) {
    metricSeries[metric.key] = track.map(function(entry) {
      return entry[metric.key];
    });
  });

  svg.push(
    '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' +
    escapeSvgText((QUANTITATIVE_TRACK_LABELS[trackName] || trackName) + ' quantitative comparison chart') + '">'
  );
  svg.push(
    '<line x1="' + margins.left + '" y1="' + baselineY + '" x2="' + (width - margins.right) +
    '" y2="' + baselineY + '" stroke="#cfd5df" stroke-width="1.5"></line>'
  );

  track.forEach(function(entry, methodIndex) {
    var groupX = startX + methodIndex * (groupWidth + groupGap);
    var groupCenter = groupX + groupWidth / 2;

    QUANTITATIVE_METRICS.forEach(function(metric, metricIndex) {
      var normalized = normalizeQuantitativeValue(metric, entry[metric.key], metricSeries[metric.key]);
      var barHeight = Math.max(8, plotHeight * normalized);
      var x = groupX + metricIndex * (barWidth + barGap);
      var y = baselineY - barHeight;
      var valueLabel = formatQuantitativeValue(metric.key, entry[metric.key]);
      var title = entry.method + ' | ' + metric.label + ': ' + valueLabel;

      svg.push(
        '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + barHeight +
        '" rx="2.5" fill="' + metric.color + '" opacity="0.92">' +
        '<title>' + escapeSvgText(title) + '</title></rect>'
      );
      svg.push(
        '<text x="' + (x + barWidth / 2) + '" y="' + (y - 5) + '" text-anchor="end" font-size="' +
        valueFontSize + '" fill="#5c6370" transform="rotate(-65 ' + (x + barWidth / 2) + ' ' + (y - 5) +
        ')">' + escapeSvgText(valueLabel) + '</text>'
      );
    });

    svg.push(
      '<text x="' + groupCenter + '" y="' + (baselineY + 22) + '" text-anchor="middle" font-size="' +
      methodFontSize + '" fill="#3d4451">' + escapeSvgText(entry.method) + '</text>'
    );
  });

  svg.push('</svg>');
  container.innerHTML = svg.join('');
}

function renderQuantitativeCharts() {
  quantitativeChartsRendered = true;
  renderQuantitativeTrack('quant-chart-sss', 'SSS');
  renderQuantitativeTrack('quant-chart-ssd', 'SSD');
  renderQuantitativeTrack('quant-chart-msd', 'MSD');
}

function scheduleQuantitativeChartsRender() {
  if (!quantitativeChartsRendered) {
    return;
  }

  if (quantitativeResizeTimer !== null) {
    window.clearTimeout(quantitativeResizeTimer);
  }
  quantitativeResizeTimer = window.setTimeout(function() {
    renderQuantitativeCharts();
  }, 120);
}

function setupQuantitativeChartsRendering() {
  var firstChart = document.getElementById('quant-chart-sss');
  var section = firstChart ? firstChart.closest('.section') : null;

  if (!firstChart || !section) {
    return;
  }

  function renderOnce() {
    if (!quantitativeChartsRendered) {
      renderQuantitativeCharts();
    }
  }

  scheduleIdleTask(renderOnce, 2200);

  if (!('IntersectionObserver' in window)) {
    return;
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        renderOnce();
        observer.disconnect();
      }
    });
  }, {
    rootMargin: '900px 0px',
    threshold: 0.01
  });

  observer.observe(section);
}

function copyTextToClipboard(text) {
  return new Promise(function(resolve, reject) {
    function fallbackCopy() {
      var textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.style.left = '0';
      textArea.style.top = '0';
      textArea.style.width = '1px';
      textArea.style.height = '1px';
      document.body.appendChild(textArea);

      textArea.focus({preventScroll: true});
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);

      try {
        var successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          resolve();
        } else {
          reject(new Error('Copy command was unsuccessful.'));
        }
      } catch (error) {
        document.body.removeChild(textArea);
        reject(error);
      }
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(resolve).catch(function() {
        fallbackCopy();
      });
      return;
    }

    fallbackCopy();
  });
}

function setupBibtexCopy() {
  var copyButton = document.getElementById('copy-bibtex-button');
  var copyLabel = document.getElementById('copy-bibtex-label');
  var bibtexBlock = document.getElementById('bibtex-content');

  if (!copyButton || !copyLabel || !bibtexBlock) {
    return;
  }

  var defaultText = 'Copy BibTeX';
  var bibtexCode = bibtexBlock.querySelector('code');

  copyButton.addEventListener('click', function(event) {
    event.preventDefault();
    var bibtexText = bibtexCode ? bibtexCode.innerText : bibtexBlock.innerText;

    copyTextToClipboard(bibtexText).then(function() {
      copyLabel.textContent = 'Copied';
      window.setTimeout(function() {
        copyLabel.textContent = defaultText;
      }, 1600);
    }).catch(function() {
      copyLabel.textContent = 'Copy Failed';
      window.setTimeout(function() {
        copyLabel.textContent = defaultText;
      }, 1800);
    });
  });
}

function primeCarouselVideo(video) {
  if (!video || video.dataset.loaded === 'true') {
    return;
  }

  var sources = Array.prototype.slice.call(video.querySelectorAll('source[data-src]'));
  if (!sources.length) {
    return;
  }

  sources.forEach(function(source) {
    source.src = source.dataset.src;
  });
  video.dataset.loaded = 'true';
  video.preload = 'auto';
  video.load();
}

function playCarouselVideo(video) {
  if (!video) {
    return;
  }

  primeCarouselVideo(video);
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');

  var playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(function() {});
  }
}

function pauseCarouselVideo(video) {
  if (video && !video.paused) {
    video.pause();
  }
}

function setupLazyCarouselVideos() {
  var carousel = document.getElementById('results-carousel');
  var videos = Array.prototype.slice.call(document.querySelectorAll('.lazy-carousel-video'));

  if (!carousel || !videos.length) {
    return;
  }

  var isCarouselNearViewport = false;
  var preloadScheduled = false;

  function scheduleCarouselPreload() {
    if (preloadScheduled) {
      return;
    }

    preloadScheduled = true;

    scheduleIdleTask(function() {
      videos.forEach(function(video, index) {
        window.setTimeout(function() {
          primeCarouselVideo(video);
        }, index * 350);
      });
    }, 450);
  }

  function syncCarouselPlayback() {
    carousel.dataset.shouldPlay = (isCarouselNearViewport && !document.hidden) ? 'true' : 'false';

    if (carousel.dataset.shouldPlay === 'true') {
      videos.forEach(primeCarouselVideo);
      videos.forEach(playCarouselVideo);
    } else {
      videos.forEach(pauseCarouselVideo);
    }
  }

  videos.forEach(function(video) {
    video.addEventListener('canplay', function() {
      if (carousel.dataset.shouldPlay === 'true') {
        playCarouselVideo(video);
      }
    });
  });

  scheduleCarouselPreload();

  if (!('IntersectionObserver' in window)) {
    isCarouselNearViewport = true;
    syncCarouselPlayback();
    return;
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      isCarouselNearViewport = entry.isIntersecting;
      syncCarouselPlayback();
    });
  }, {
    rootMargin: '900px 0px',
    threshold: 0.15
  });

  observer.observe(carousel);

  document.addEventListener('visibilitychange', function() {
    syncCarouselPlayback();
  });
}

function setupResearchDropdown() {
  var dropdown = document.querySelector('.top-showcase .navbar-item.has-dropdown');
  if (!dropdown) {
    return;
  }

  var trigger = dropdown.querySelector('.navbar-link');
  var hideTimer = null;

  function clearHideTimer() {
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function openDropdown() {
    clearHideTimer();
    dropdown.classList.add('is-active');
  }

  function closeDropdown() {
    clearHideTimer();
    hideTimer = window.setTimeout(function() {
      dropdown.classList.remove('is-active');
    }, 120);
  }

  dropdown.addEventListener('mouseenter', openDropdown);
  dropdown.addEventListener('mouseleave', closeDropdown);
  dropdown.addEventListener('focusin', openDropdown);
  dropdown.addEventListener('focusout', function(event) {
    if (!dropdown.contains(event.relatedTarget)) {
      closeDropdown();
    }
  });

  if (trigger) {
    trigger.addEventListener('click', function(event) {
      event.preventDefault();
      clearHideTimer();
      dropdown.classList.toggle('is-active');
    });
  }

  document.addEventListener('click', function(event) {
    if (!dropdown.contains(event.target)) {
      clearHideTimer();
      dropdown.classList.remove('is-active');
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
    var navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'));
    navbarBurgers.forEach(function(burger) {
      burger.addEventListener('click', function() {
        Array.prototype.slice.call(document.querySelectorAll('.navbar-burger, .navbar-menu')).forEach(function(element) {
          element.classList.toggle('is-active');
        });
      });
    });

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    };

    var resultsCarousel = document.querySelector('#results-carousel');
    if (resultsCarousel) {
      var resultItems = resultsCarousel.querySelectorAll('.item');
      if (resultItems.length <= 1) {
        resultsCarousel.classList.remove('carousel');
        resultsCarousel.classList.add('is-static');
      } else {
        var visibleSlides = Math.min(3, resultItems.length);
        options.slidesToShow = visibleSlides;
        options.loop = resultItems.length > visibleSlides;
        options.infinite = resultItems.length > visibleSlides;
      }
    }

		// Initialize all div with carousel class
    if (window.bulmaCarousel && typeof bulmaCarousel.attach === 'function') {
      bulmaCarousel.attach('.carousel', options);
    }
    if (resultsCarousel && (resultsCarousel.classList.contains('is-static') || resultsCarousel.querySelector('.slider-container'))) {
      resultsCarousel.classList.add('is-carousel-ready');
    }

    setupResearchDropdown();
    setupQuantitativeChartsRendering();
    setupBibtexCopy();
    setupLazyCarouselVideos();
    window.addEventListener('resize', scheduleQuantitativeChartsRender);

});

window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}

function setComparePosition(wrapper, percentage) {
  var clamped = Math.max(0, Math.min(100, percentage));
  var overlay = wrapper.querySelector('[data-compare-overlay]');
  var divider = wrapper.querySelector('[data-compare-handle]');
  overlay.style.clipPath = 'inset(0 ' + (100 - clamped) + '% 0 0)';
  divider.style.left = clamped + '%';
  wrapper.dataset.comparePosition = clamped;
}

function playCompareVideo(video) {
  if (!video) return;
  var playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(function() {});
  }
}

function syncVideoTime(source, target, force) {
  if (!source || !target) return;
  if (Math.abs(source.currentTime - target.currentTime) > 0.08 || force) {
    try {
      target.currentTime = source.currentTime;
    } catch (error) {
      // Ignore transient seek errors until metadata is ready.
    }
  }
}

function getActiveSecondary(wrapper) {
  return wrapper.querySelector('[data-compare-secondary].is-active');
}

function updateCompareToggleLabel(button, activeKey) {
  if (!button) return;
  var defaultLabel = button.dataset.compareLabelDefault || 'Click to compare with AbsGS';
  var altLabel = button.dataset.compareLabelAlt || 'Click to compare with 3DGS';
  button.textContent = activeKey === '3dgs' ? defaultLabel : altLabel;
}

function updateComparePlaybackLabel(button, isPaused) {
  if (!button) return;
  var playLabel = button.dataset.compareLabelPlay || 'Play';
  var pauseLabel = button.dataset.compareLabelPause || 'Pause';
  button.textContent = isPaused ? playLabel : pauseLabel;
}

function setActiveSecondary(wrapper, activeKey) {
  wrapper.querySelectorAll('[data-compare-secondary]').forEach(function(video) {
    var isActive = video.dataset.compareKey === activeKey;
    video.classList.toggle('is-active', isActive);
    video.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    if (!isActive) {
      video.pause();
    }
  });
  wrapper.dataset.compareSecondaryActive = activeKey;
}

function syncCompareVideos(wrapper, primary, secondaryVideos) {
  if (!primary || !secondaryVideos.length) return null;

  function syncActive(force) {
    var activeSecondary = getActiveSecondary(wrapper);
    if (!activeSecondary) return;
    syncVideoTime(primary, activeSecondary, force);
    activeSecondary.playbackRate = primary.playbackRate;
  }

  primary.addEventListener('play', function() {
    syncActive(true);
    playCompareVideo(getActiveSecondary(wrapper));
  });

  primary.addEventListener('pause', function() {
    var activeSecondary = getActiveSecondary(wrapper);
    if (activeSecondary) {
      activeSecondary.pause();
    }
  });

  primary.addEventListener('seeking', function() {
    syncActive(true);
  });

  primary.addEventListener('timeupdate', function() {
    syncActive(false);
  });

  primary.addEventListener('ratechange', function() {
    syncActive(true);
  });

  secondaryVideos.forEach(function(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.addEventListener('loadedmetadata', function() {
      if (video.classList.contains('is-active')) {
        syncActive(true);
        if (!primary.paused) {
          playCompareVideo(video);
        }
      }
    });
  });

  return {
    syncActive: syncActive
  };
}

function initCompareSlider(wrapper) {
  var primary = wrapper.querySelector('[data-compare-primary]');
  var secondaryVideos = Array.from(wrapper.querySelectorAll('[data-compare-secondary]'));
  var root = wrapper.closest('[data-compare-root]') || wrapper;
  var toggleButton = root.querySelector('[data-compare-toggle]');
  var playToggleButton = wrapper.querySelector('[data-compare-play-toggle]');
  if (!primary || !secondaryVideos.length) return;

  setComparePosition(wrapper, 50);
  setActiveSecondary(wrapper, wrapper.dataset.compareSecondaryActive || '3dgs');
  updateCompareToggleLabel(toggleButton, wrapper.dataset.compareSecondaryActive || '3dgs');
  updateComparePlaybackLabel(playToggleButton, false);

  var syncController = syncCompareVideos(wrapper, primary, secondaryVideos);

  var isDragging = false;

  function updateFromPointer(clientX) {
    var rect = wrapper.getBoundingClientRect();
    var percentage = ((clientX - rect.left) / rect.width) * 100;
    setComparePosition(wrapper, percentage);
  }

  function onPointerMove(event) {
    if (!isDragging) return;
    updateFromPointer(event.clientX);
  }

  function stopDragging() {
    isDragging = false;
    wrapper.classList.remove('is-dragging');
  }

  wrapper.addEventListener('pointerdown', function(event) {
    if (event.target.closest('[data-compare-play-toggle]')) {
      return;
    }
    isDragging = true;
    wrapper.classList.add('is-dragging');
    updateFromPointer(event.clientX);
  });

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopDragging);
  window.addEventListener('pointercancel', stopDragging);

  primary.addEventListener('play', function() {
    updateComparePlaybackLabel(playToggleButton, false);
  });

  primary.addEventListener('pause', function() {
    updateComparePlaybackLabel(playToggleButton, true);
  });

  primary.addEventListener('loadedmetadata', function() {
    if (syncController) {
      syncController.syncActive(true);
    }
  });

  if (toggleButton) {
    toggleButton.addEventListener('click', function() {
      var currentKey = wrapper.dataset.compareSecondaryActive || '3dgs';
      var nextKey = currentKey === '3dgs' ? 'absgs' : '3dgs';
      var currentVideo = getActiveSecondary(wrapper);

      if (currentVideo) {
        currentVideo.pause();
      }

      setActiveSecondary(wrapper, nextKey);
      updateCompareToggleLabel(toggleButton, nextKey);

      if (syncController) {
        syncController.syncActive(true);
      }

      if (!primary.paused) {
        playCompareVideo(getActiveSecondary(wrapper));
      }
    });
  }

  if (playToggleButton) {
    playToggleButton.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      if (primary.paused) {
        playCompareVideo(primary);
      } else {
        primary.pause();
      }
    });
  }

  secondaryVideos.forEach(function(video) {
    if (video.classList.contains('is-active') && !primary.paused) {
      playCompareVideo(video);
    }
  });

  if (primary.paused) {
    playCompareVideo(primary);
  }
}


$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);

    // Loop on each carousel initialized
    for(var i = 0; i < carousels.length; i++) {
    	// Add listener to  event
    	carousels[i].on('before:show', state => {
    		console.log(state);
    	});
    }

    // Access to bulmaCarousel instance of an element
    var element = document.querySelector('#my-element');
    if (element && element.bulmaCarousel) {
    	// bulmaCarousel instance is available as element.bulmaCarousel
    	element.bulmaCarousel.on('before-show', function(state) {
    		console.log(state);
    	});
    }

    /*var player = document.getElementById('interpolation-video');
    player.addEventListener('loadedmetadata', function() {
      $('#interpolation-slider').on('input', function(event) {
        console.log(this.value, player.duration);
        player.currentTime = player.duration / 100 * this.value;
      })
    }, false);*/
    preloadInterpolationImages();

    $('#interpolation-slider').on('input', function(event) {
      setInterpolationImage(this.value);
    });
    setInterpolationImage(0);
    $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);

    document.querySelectorAll('[data-compare-slider]').forEach(function(wrapper) {
      initCompareSlider(wrapper);
    });

    bulmaSlider.attach();

})

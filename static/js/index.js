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
  overlay.style.width = clamped + '%';
  divider.style.left = clamped + '%';
  wrapper.dataset.comparePosition = clamped;
}

function syncCompareVideos(primary, secondary) {
  if (!primary || !secondary) return;

  function syncTime(force) {
    if (Math.abs(primary.currentTime - secondary.currentTime) > 0.08 || force) {
      try {
        secondary.currentTime = primary.currentTime;
      } catch (error) {
        // Ignore transient seek errors until metadata is ready.
      }
    }
  }

  primary.addEventListener('play', function() {
    syncTime(true);
    var playPromise = secondary.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function() {});
    }
  });

  primary.addEventListener('pause', function() {
    secondary.pause();
  });

  primary.addEventListener('seeking', function() {
    syncTime(true);
  });

  primary.addEventListener('timeupdate', function() {
    syncTime(false);
  });

  primary.addEventListener('ratechange', function() {
    secondary.playbackRate = primary.playbackRate;
  });

  secondary.muted = true;
  secondary.defaultMuted = true;
}

function initCompareSlider(wrapper) {
  var primary = wrapper.querySelector('[data-compare-primary]');
  var secondary = wrapper.querySelector('[data-compare-secondary]');
  if (!primary || !secondary) return;

  setComparePosition(wrapper, 50);
  syncCompareVideos(primary, secondary);

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
    isDragging = true;
    wrapper.classList.add('is-dragging');
    updateFromPointer(event.clientX);
  });

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopDragging);
  window.addEventListener('pointercancel', stopDragging);

  primary.addEventListener('loadedmetadata', function() {
    secondary.currentTime = primary.currentTime;
    secondary.playbackRate = primary.playbackRate;
    var playPromise = secondary.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function() {});
    }
  });
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

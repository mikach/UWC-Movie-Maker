(function () {
    'use strict';

    function loadTrack(evt) {
        // Create new track instance
        var track = new TimeLine.Track(evt.target.files[0]);
        // and add it to timeline
        TimeLine.add(track);
        // Reset input
        $(this).val('');
    }

    function loadProject(evt) {
        var file = evt.target.files[0];
        TimeLine.loadFromFile(file);
    };

    // Event listeners
    $('#trackInput').on('change', loadTrack);
    $('#projectInput').on('change', loadProject);

    // Ability to drag track on timeline
    (function() {
        var pageX, footer = $('footer');

        footer.on('mousedown', '.track div', function(evt) {
            pageX = evt.pageX - $(this).offset().left;
        });
        footer.on('mouseup mouseleave', '.track div', function(evt) {
            pageX = void 0;
            var index = $(this).attr('data-index'),
                offset = Math.floor( TimeLine.totalDuration*$(this).offset().left/TimeLine.$el.width() );
            TimeLine.tracks[index].offset = offset;
        });
        footer.on('mousemove', '.track div', function(evt) {
            if (typeof pageX !== 'undefined') {
                $(this).css('left', (evt.pageX-pageX) + 'px');
            }
        });
    })();

    // Trackline events
    (function() {
        var trackLine = $('.trackline');
        trackLine.on('click', function(e) {
            var position = Math.floor( TimeLine.totalDuration*e.pageX/TimeLine.$el.width() );
            TimeLine.position = position;
            TimeLine.renderImage();
            // TimeLine.renderAudio();
            TimeLine.renderTrackline();
        });
    })();

    // Controls events
    (function() {
        var controls = $('#controls');
        controls.on('click', '.play', TimeLine.play);
        controls.on('click', '.pause', TimeLine.pause);
        controls.on('click', '.fullscreen', function() {
            var frame = $('#frame')[0];
            (frame.requestFullscreen || frame.mozRequestFullScreen || frame.webkitRequestFullscreen).call(frame);
        });
        controls.on('change', '.volume', function() {
            var v = $(this).val()/100;
            TimeLine.volume = v;
            $(this).next().text($(this).val() + '%');
        });
    })();

    // Full screen control
    (function() {
        var changeFullscreen = function(fullscreen) {
            if (fullscreen) {
                var height = $(window).height(),
                    width = 320*height/240;
                $('#frame').height(height).width(width);
            } else {
                $('#frame').height(240).width(320);
            }
        };

        document.addEventListener("fullscreenchange", function () {
            changeFullscreen(document.fullscreen);
        }, false);

        document.addEventListener("mozfullscreenchange", function () {
            changeFullscreen(document.mozFullScreen);
        }, false);

        document.addEventListener("webkitfullscreenchange", function () {
            changeFullscreen(document.webkitIsFullScreen);
        }, false);
    })();

    // Save project
    $('#save').on('click', function() {
        var json = TimeLine.toJSON();
        var blob = new Blob([JSON.stringify(json)], { type: 'application/octet-binary' });
        var url = URL.createObjectURL(blob);
        window.open(url, '_blonk');
    });
})();
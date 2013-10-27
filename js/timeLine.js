(function() {
    'use strict';

    function isFile(file) {
        return file instanceof File;
    }

    var TimeLine = {
        // Element on page
        $el: $('.tracks'),
        // Frames container
        $frame: $('#frame'),
        // Line element
        $line: $('.trackline .line'),
        // Array of all tracks
        _tracks: [],
        // Getter for tracks
        get tracks() {
            return this._tracks;
        },
        // Different types of content
        contentType: {
            image: 1,
            audio: 2
            // video: 3
        },
        // Current position
        _position: 0,
        // Getter and setter for position
        get position() {
            return this._position;
        },
        set position(pos) {
            this._position = pos;
        },
        // Default volume is 1
        _volume: 1,
        get volume() {
            return this._volume;
        },
        set volume(v) {
            this._volume = v;
        },
        // Add track to timeline
        add: function(track) {
            this._tracks.push(track);
            this.$el.append(track.$el);
            track.$inner.attr('data-index', this._tracks.length-1);
            return track;
        },
        // Remove track from timeline
        remove: function(track) {
            var index = this._tracks.indexOf(track);
            if (index > -1) this._tracks.splice(index, 1);
            this.$el.remove(track.$el);
            return track;
        },
        // Default movie duration is 600s
        totalDuration: 600
    };

    // Track's constructor
    var Track = function(file) {
        if (!(this instanceof Track)) return new Track(file);
        if (!isFile(file)) throw file + " is not instance of File";

        this.file = file;
        this.name = file.name;
        this.type = file.type.split('/')[0];

        if (!(this.type in TimeLine.contentType))
            throw file.type + " is unsupported format";

        this._offset = 0;
        this._duration = 0;

        // Create dom element
        this.$el = $('<div />');
        this.$inner = $('<div />');
        this.$el.addClass('track').append( this.$inner );
        this.$inner.attr('data-type', this.type);

        // Render element
        this.render[this.type].call(this);
    };

    Track.prototype = {
        get offset() {
            return this._offset;
        },
        set offset(val) {
            this._offset = val;
        },
        get duration() {
            return this._duration;
        },
        set duration(val) {
            this._duration = val;
        },
        render: {
            image: function() {
                if (this.duration === 0)
                    this.duration = 100; // default duration for images

                // Calculate width
                var width = TimeLine.$el.width() / (TimeLine.totalDuration/this.duration);
                this.$inner.css('width', width + 'px').text(this.name || '');

                if (this.offset > 0) {
                    // Calculate left
                    var left = TimeLine.$el.width() / (TimeLine.totalDuration/this.offset);
                    this.$inner.css('left', left + 'px');
                }

                if (!this.data) {
                    // Read data and append image to track's container
                    var reader = new FileReader(), self = this;
                    reader.onload = function(e) {
                        self.data = e.target.result;
                        self.$inner.append('<img src="' + self.data + '" />');
                    };
                    reader.readAsDataURL(this.file);
                }
            },
            audio: function() {
                var self = this;

                // create audio element
                this.$audio = $('<audio />');
                this.$inner.append( this.$audio );

                if (this.offset > 0) {
                    // Calculate left position
                    var left = TimeLine.$el.width() / (TimeLine.totalDuration/this.offset);
                    this.$inner.css('left', left + 'px');
                }

                // Read track's duration
                this.$audio.on('loadedmetadata', function() {
                    self.duration = this.duration;
                    var width = TimeLine.$el.width() / (TimeLine.totalDuration/this.duration);
                    self.$inner.css('width', width + 'px').text(self.name || '');
                });

                if (!this.data) {
                    // Read audio data
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        self.data = e.target.result;
                        self.$audio.attr('src', self.data);
                    };
                    reader.readAsDataURL(this.file);
                } else {
                    this.$audio.attr('src', this.data);
                }
            }
        }
    };

    TimeLine.Track = Track;


    // Calculate trackline's left from Timeline position
    TimeLine.renderTrackline = function() {
        var left = TimeLine.$el.width()*TimeLine.position/TimeLine.totalDuration;
        TimeLine.$line.css('left', left + 'px');
        TimeLine.$line.siblings('span').text(TimeLine.position + 's');
    };

    // Find current image from position
    // and show it on main screen
    TimeLine.renderImage = function() {
        var _track = null;
        for (var i = 0, max = TimeLine.tracks.length; i < max; i++) {
            var track = TimeLine.tracks[i];
            if ((track.type === 'image') && 
                (track.offset <= TimeLine.position) && 
                (track.offset + track.duration >= TimeLine.position)) {
                _track = track;
                break;
            }
        }
        TimeLine.$frame.find('img').remove();
        TimeLine.$frame.append('<img />');
        if (_track) {
            TimeLine.$frame.find('img').eq(0).attr('src', _track.data);
        }
    };

    // Find current audio element
    // change it position if need
    // start playing
    TimeLine.renderAudio = function(resetPosition) {
        var _audio = null;
        for (var i = 0, max = TimeLine.tracks.length; i < max; i++) {
            var track = TimeLine.tracks[i];
            if ((track.type === 'audio') && 
                (track.offset <= TimeLine.position) && 
                (track.offset + track.duration >= TimeLine.position)) {
                _audio = track;
                break;
            }
        }
        if (_audio) {
            if (TimeLine.currentAudio !== _audio) {
                if (TimeLine.currentAudio)
                    TimeLine.currentAudio.$audio[0].pause();
                TimeLine.currentAudio = _audio;
                _audio.$audio[0].currentTime = 0;
                _audio.$audio[0].volume = TimeLine.volume;
                _audio.$audio[0].play();
            } else {
                var time = TimeLine.position - _audio.offset;
                if (Math.abs(TimeLine.currentAudio.$audio[0].currentTime-time) > 2)
                    TimeLine.currentAudio.$audio[0].currentTime = TimeLine.position - _audio.offset;
                _audio.$audio[0].volume = TimeLine.volume;
                if (_audio.$audio[0].paused)
                    _audio.$audio[0].play();
            }
        } else {
            TimeLine.currentAudio = null;
        }
    };

    // Set up interval that re-render image and control audio flow
    TimeLine.play = function() {
        TimeLine.interval = setInterval(function() {
            TimeLine.position += 1;
            if (TimeLine.position >= TimeLine.duration) {
                TimeLine.position = 0;
                TimeLine.pause();
            }
            TimeLine.renderTrackline();
            TimeLine.renderImage();
            TimeLine.renderAudio();
        }, 1000);
    };

    // Stops audio and clear main interval
    TimeLine.pause = function() {
        clearInterval(TimeLine.interval);
        if (TimeLine.currentAudio) 
            TimeLine.currentAudio.$audio[0].pause();
    };

    // Create json from TimeLine object
    // with all tracks inside
    TimeLine.toJSON = function() {
        var json = {};
        ['position', 'volume'].forEach(function(i) {
            json[i] = TimeLine[i];
        });
        json.tracks = [];
        TimeLine.tracks.forEach(function(track) {
            json.tracks.push({
                name: track.name,
                type: track.type,
                duration: track.duration,
                offset: track.offset,
                data: track.data
            });
        });
        return json;
    };

    // Clear all timeline's settings
    TimeLine.reset = function() {
        TimeLine._tracks = [];
        TimeLine.currentAudio = null;
        TimeLine.$el.html('');
        TimeLine.position = 0;
        TimeLine.volume = 0;
        TimeLine.renderImage();
        TimeLine.renderTrackline();
    };

    TimeLine.loadFromFile = function(file) {
        TimeLine.reset();
        var reader = new FileReader();
        // Start parsing
        reader.onload = function(e) {
            var data = e.target.result;
            // Convert data to object
            var obj = JSON.parse( atob( data.split('base64,').pop() ) );
            // Set up properties to timeline
            TimeLine.position = obj.position;
            TimeLine.volume = obj.volume;
            $('#controls .volume').val(TimeLine.volume*100).next().text(TimeLine.volume*100 + '%');
            // Parse trackes
            obj.tracks.forEach(function(i) {
                var track = {};
                // track is instance of Track
                track.constructor = TimeLine.Track;
                track.offset = i.offset;
                track.data = i.data;
                track.duration = i.duration;
                track.name = i.name;
                track.type = i.type;
                // Create dom element
                track.$el = $('<div />');
                track.$inner = $('<div />');
                track.$el.addClass('track').append( track.$inner );
                track.$inner.attr('data-type', track.type);
                // Render track's element
                Track.prototype.render[track.type].call(track);
                // Add to timeline
                TimeLine.add(track);
            });
            // Render image and trackline
            TimeLine.renderTrackline();
            TimeLine.renderImage();
        };
        reader.readAsDataURL(file);
    };

    window.TimeLine = TimeLine;
})();
/**
 * @fileOverview Transport
 * @todo 支持chunked传输，优势：
 * 可以将大文件分成小块，挨个传输，可以提高大文件成功率，当失败的时候，也只需要重传那小部分，
 * 而不需要重头再传一次。另外断点续传也需要用chunked方式。
 */
define([
    'base',
    './runtime'
], function( Base, Html5Runtime ) {

    var noop = Base.noop,
        $ = Base.$;

    return Html5Runtime.register( 'Transport', {
        init: function() {
            this._status = 0;
            this._response = null;
            this._responseHeader = null;
        },

        send: function() {
            var owner = this.owner,
                opts = this.options,
                xhr = this._initAjax(),
                blob = owner._blob,
                server = opts.server,
                formData, binary;

            if ( opts.sendAsBinary ) {
                server += (/\?/.test( server ) ? '&' : '?') +
                        $.param( owner._formData );

                binary = blob.getSource();
            } else {
                formData = new FormData();
                $.each( owner._formData, function( k, v ) {
                    formData.append( k, v );
                });

                formData.append( opts.fileVar, blob.getSource(),
                        opts.filename || owner._formData.name || '' );
            }

            if ( opts.withCredentials && 'withCredentials' in xhr ) {
                xhr.open( opts.method, server, true );
                xhr.withCredentials = true;
            } else {
                xhr.open( opts.method, server );
            }

            this._setRequestHeader( xhr, opts.headers );
            binary && xhr.overrideMimeType('application/octet-stream');
            xhr.send( binary || formData );
        },

        getResponse: function() {
            return this._response;
        },

        getResponseAsJson: function() {
            return this._parseJson( this._response );
        },

        getStatus: function() {
            return this._status;
        },

        getResponseHeader: function() {
            return this._responseHeader;
        },

        abort: function() {
            var xhr = this._xhr;

            if ( xhr ) {
                xhr.upload.onprogress = noop;
                xhr.onreadystatechange = noop;
                xhr.abort();

                this._xhr = xhr = null;
            }
        },

        destroy: function() {
            this.abort();
        },

        _initAjax: function() {
            var me = this,
                xhr = new XMLHttpRequest(),
                opts = this.options;

            if ( opts.withCredentials && !('withCredentials' in xhr) &&
                    typeof XDomainRequest !== 'undefined' ) {
                xhr = new XDomainRequest();
            }

            xhr.upload.onprogress = function( e ) {
                var percentage = 0;

                if ( e.lengthComputable ) {
                    percentage = e.loaded / e.total;
                }

                return me.trigger( 'progress', percentage );
            };

            xhr.onreadystatechange = function() {

                if ( xhr.readyState !== 4 ) {
                    return;
                }

                xhr.upload.onprogress = noop;
                xhr.onreadystatechange = noop;
                me._xhr = null;

                // 只考虑200的情况
                if ( xhr.status === 200 ) {
                    me._response = xhr.responseText;
                    me._responseHeader = me._parseXhrHeaders( xhr );
                    return me.trigger('load');
                }

                me._status = xhr.status;
                xhr = null;

                return me.trigger( 'error', me._status ? 'http' : 'abort' );
            };

            me._xhr = xhr;
            return xhr;
        },

        _setRequestHeader: function( xhr, headers ) {
            $.each( headers, function( key, val ) {
                xhr.setRequestHeader( key, val );
            });
        },

        _parseXhrHeaders: function( xhr ) {
            var str = xhr.getAllResponseHeaders(),
                ret = {};


            $.each( str.split( /\n/ ), function( i, str ) {
                var match = /^(.*?): (.*)$/.exec( str );

                if ( match ) {
                    ret[ match[ 1 ] ] = match[ 2 ];
                }
            });

            return ret;
        },

        _parseJson: function( str ) {
            var json;

            try {
                json = JSON.parse( str );
            } catch ( ex ) {
                json = {};
            }

            return json;
        }
    });
});
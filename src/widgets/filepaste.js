/**
 * @fileOverview 组件基类。
 */
define([
    'base',
    'core/uploader',
    'lib/filepaste',
    './widget'
], function( Base, Uploader, FilePaste ) {

    return Uploader.register({
        init: function( opts ) {

            if ( !opts.paste || this.request('get-runtime-type') !== 'html5' ) {
                return;
            }

            var me = this,
                deferred = Base.Deferred(),
                options = $.extend({}, {
                    container: opts.paste,
                    accept: opts.accept
                }),
                paste;

            paste = new FilePaste( options );

            paste.once( 'ready', deferred.resolve );
            paste.on( 'paste', function( files ) {
                me.owner.request( 'add-file', [ files ]);
            });
            paste.init();

            return deferred.promise();
        }
    });
});
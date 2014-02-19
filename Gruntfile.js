'use strict';
var LIVERELOAD_PORT = 35729;
var SERVER_PORT = 8000;
var lrSnippet = require('connect-livereload')({port: LIVERELOAD_PORT});
var mountFolder = function (connect, dir) {
    return connect.static(require('path').resolve(dir));
};

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to match all subfolders:
// 'test/spec/**/*.js'
// templateFramework: 'lodash'

module.exports = function (grunt) {
    // show elapsed time at the end
    require('time-grunt')(grunt);
    // load all grunt tasks
    require('load-grunt-tasks')(grunt);

    // configurable paths
    var yeomanConfig = {
        app: 'app',
        dist: 'dist'
    };
    
    // We do not want the default behavior of serving only the app folder.
    // Instead we want to serve the base repo directory, as this will give us
    // access to the test dir as well. Further, if you don't have a homescreen
    // defined, it doesn't really make sense to have a single index.html.
    var baseDirForServer = '';
    var tablesConfig = {
        appName: 'tables',
        // The mount point of the device. Should allow adb push/pull.
        deviceMount: '/sdcard/opendatakit',
        // The directory where the 'tables' directory containing the tableId
        // directories lives.
        tablesDir: yeomanConfig.app + '/tables',
        // Where the templates for a new tableId folder lives. i.e. if you want
        // to add a table, the contents of this directory would be copied to
        // tablesDir/tableId.
        tableTemplateDir: 'grunttemplates/table/default',
        // tableIdStr will be what we replace in the table template with the
        // provided tableId. E.g. '../%TABLE_ID%_list.html' will become
        // '../myTableId_list.html'
        tableIdStr: '%TABLE_ID%',
        // The string we need to replace with the app name.
        appStr: '%APP%',
        // The output directory
        outputDbDir: 'output/db',
        // The directory where csvs are output.
        outputCsvDir: 'output/csv',
        // The directory where the debug objects are output.
        outputDebugDir: 'output/debug',
        // The db path on the phone. %APP% should be replaced by app name
        deviceDbPath: '/sdcard/opendatakit/%APP%/metadata/webDb/' +
            'http_localhost_8635/0000000000000001.db'
        
    };

    grunt.initConfig({

        // Here we have to set the objects for the exec task. We are using
        // grunt-exec to execute the adb push and adb pull commands.
        // cmd is the command that is run when calling this task with the
        // target and must return a string.
        exec: {
            adbpush: {
                cmd: function(src, dest) {
                    return 'adb push ' + src + ' ' + dest;
                }
            },
            adbpull: {
                cmd: function(src, dest) {
                    return 'adb pull ' + src + ' ' + dest;
                }
            }
        },

        yeoman: yeomanConfig,
        watch: {
            options: {
                nospawn: true,
                livereload: true
            },
            livereload: {
                options: {
                    livereload: LIVERELOAD_PORT
                },
                files: [
                    '<%= yeoman.app %>/*.html',
                    '{.tmp,<%= yeoman.app %>}/styles/{,*/}*.css',
                    '{.tmp,<%= yeoman.app %>}/scripts/{,*/}*.js',
                    '<%= yeoman.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp}',
                    '<%= yeoman.app %>/scripts/templates/*.{ejs,mustache,hbs}',
                    'test/spec/**/*.js',
                    // We also want to watch all the files in app/tables and
                    // app/assets. If others change that you are interested in,
                    // add them here to be watched as well.
                    '<%= yeoman.app %>/tables/**',
                    '<%= yeoman.app %>/assets/**',
                    // And the framework js objects.
                    '<%= yeoman.app %>/framework/js/**',
                    // And the test files.
                    'test/**/*.{js, html}'
                ]
            },
            test: {
                files: ['<%= yeoman.app %>/scripts/{,*/}*.js', 'test/spec/**/*.js'],
                tasks: ['test']
            }
        },
        connect: {
            options: {
                port: SERVER_PORT,
                // change this to '0.0.0.0' to access the server from outside
                hostname: 'localhost'
            },
            livereload: {
                options: {
                    middleware: function (connect) {
                        return [
                            lrSnippet,
                            mountFolder(connect, '.tmp'),
                            mountFolder(connect, baseDirForServer)
                        ];
                    }
                }
            },
            test: {
                options: {
                    port: 8001,
                    middleware: function (connect) {
                        return [
                            lrSnippet,
                            mountFolder(connect, '.tmp'),
                            mountFolder(connect, 'test'),
                            mountFolder(connect, baseDirForServer)
                        ];
                    }
                }
            },
            dist: {
                options: {
                    middleware: function (connect) {
                        return [
                            mountFolder(connect, yeomanConfig.dist)
                        ];
                    }
                }
            }
        },
        open: {
            server: {
                path: 'http://localhost:<%= connect.options.port %>'
            }
        },
    });

    // We need grunt-exec to run adb commands from within grunt. 
    grunt.loadNpmTasks('grunt-exec');

    // Just an alias task--shorthand for doing all the pullings
    grunt.registerTask(
        'adbpull',
        'Perform all the adbpull tasks',
        ['adbpull-debug', 'adbpull-db', 'adbpull-csv']);

    // Just an alias task--shorthand for doing all the pushings
    grunt.registerTask(
        'adbpush',
        'Perform all the adbpush tasks',
        ['adbpush-collect', 'adbpush-app']);

    grunt.registerTask(
        'adbpull-debug',
        'Pull the debug output objects from the device',
        function() {
            var src = tablesConfig.deviceMount + '/' + tablesConfig.appName +
                '/' + tablesConfig.outputDebugDir;
            var dest = yeomanConfig.app + '/' + tablesConfig.outputDebugDir;
            grunt.log.writeln('adb pull ' + src + ' ' + dest);
            grunt.task.run('exec:adbpull:' + src + ':' + dest);
        });

    grunt.registerTask(
        'adbpull-db',
        'Pull the db from the device',
        function() {
            var dbPath = tablesConfig.deviceDbPath;
            dbPath = dbPath.replace(tablesConfig.appStr, tablesConfig.appName);
            var src = dbPath;
            var dest = yeomanConfig.app + '/' + tablesConfig.outputDbDir;
            grunt.log.writeln('adb pull ' + src + ' ' + dest);
            grunt.task.run('exec:adbpull:' + src + ':' + dest);
        });

    grunt.registerTask(
        'adbpull-csv',
        'Pull any exported csv files from the device',
        function() {
            var src = tablesConfig.deviceMount + '/' + tablesConfig.appName +
                '/' + tablesConfig.outputCsvDir;
            var dest = yeomanConfig.app + '/' + tablesConfig.outputCsvDir;
            grunt.log.writeln('adb pull ' + src + ' ' + dest);
            grunt.task.run('exec:adbpull:' + src + ':' + dest);
        });


    grunt.registerTask(
        'adbpush-app',
        'Push everything in the app directory to the device',
        function() {
            var src = yeomanConfig.app;
            var dest = tablesConfig.deviceMount + '/' + tablesConfig.appName;
            grunt.log.writeln('adb push ' + src + ' ' + dest);
            grunt.task.run('exec:adbpush:' + src + ':' + dest);
        });

    grunt.registerTask(
        'adbpush-collect',
        'Push Collect forms to the device',
        function() {
            // The full paths to all the table id directories.
            var tableIdDirs = grunt.file.expand(tablesConfig.tablesDir + '/*');
            // Now we want just the table ids.
            var tableIds = [];
            tableIdDirs.forEach(function(element) {
                tableIds.push(element.substr(element.lastIndexOf('/') + 1));
            });
            grunt.log.writeln(this.name + ', found tableIds: ' + tableIds);
            // Now that we have the table ids, we need to push any files in the
            // collect directory.
            tableIds.forEach(function(tableId) {
                var files = grunt.file.expand(
                    tablesConfig.tablesDir + '/' + tableId +
                    '/forms/collect/*');
                files.forEach(function(file) {
                    var src = file;
                    // We basically want to push this file to something like:
                    // /sdcard/opendatakit/APP/tables/tableId/forms/collect
                    // The name of the file will stay the same if we push it
                    // to a directory, so we can leave that.
                    var dest = tablesConfig.deviceMount + '/' +
                        tablesConfig.appName + '/tables/' + tableId +
                        '/forms/collect/';
                    grunt.log.writeln(
                        'adb push ' + src + ' ' + dest);
                    grunt.task.run('exec:adbpush: ' + src + ':' + dest);
                });
            });
        });

    // This task adds a table. This includes making a folder in the app/tables
    // directory and instantiating the directory structure that is expected.
    // It also creates templates for the js and html files based on the given
    // tableId.
    grunt.registerTask(
        'addtable',
        'Adds a table directory structure',
        function(tableId) {
            if (arguments.length !== 1) {
                grunt.fail.fatal(this.name +
                ' requires one tableId. Call using "' +
                this.name + ':tableId"');
            } else {

                /**
                 * Reads the file in srcPath, replaces all instances of
                 * tablesConfig.tableIdStr with tableId, and writes it to
                 * destPath.
                 */
                var replaceIdAndWrite = function(srcPath, destPath, tableId) {
                    var contents = grunt.file.read(srcPath);
                    // Now modify it.
                    contents =
                        contents.replace(tablesConfig.tableIdStr, tableId);
                    grunt.file.write(destPath, contents);
                };

                grunt.log.writeln(
                    this.name + ' making table with id ' + tableId);
                var tableDir = tablesConfig.tablesDir + '/' + tableId;
                // First we need to make the directory in the tables dir.
                grunt.file.mkdir(tableDir);
                // Now we copy the files from the grunttemplates directory into
                // the new directory. We're going to do the files that depend
                // on the tableId independntly, doing a string replace on our
                // flag for the marker.
                // These will be the files in the tableTemplateDir we want to
                // copy directly. You must terminate with / if it is a dir.
                var toCopy = [
                    'formDef.json',
                    'forms/',
                    'forms/collect/',
                    'instances/'
                ];
                grunt.log.writeln(this.name + ', copying files: ' + toCopy);
                toCopy.forEach(function(path) {
                    var srcPath = tablesConfig.tableTemplateDir + '/' + path;
                    var destPath = tableDir + '/' + path;
                    // We have to do a special case on if it's a directory.
                    if (grunt.util._.endsWith(srcPath, '/')) {
                        grunt.file.mkdir(destPath);
                    } else {
                        grunt.file.copy(srcPath, destPath);
                    }
                });
                // Now we will copy the files to which we need to add the 
                // table id.
                var detailHtml = {
                    srcPath: tablesConfig.tableTemplateDir +
                        '/html/detail.html',
                    destPath: tableDir + '/html/' + tableId + '_detail.html'
                };
                var detailJs = {
                    srcPath: tablesConfig.tableTemplateDir + '/js/detail.js',
                    destPath: tableDir + '/js/' + tableId + '_detail.js'
                };
                var listHtml = {
                    srcPath: tablesConfig.tableTemplateDir + '/html/list.html',
                    destPath: tableDir + '/html/' + tableId + '_list.html'
                };
                var listJs = {
                    srcPath: tablesConfig.tableTemplateDir + '/js/list.js',
                    destPath: tableDir + '/js/' + tableId + '_list.js'
                };
                var filesToReplace = [
                    detailHtml,
                    detailJs,
                    listHtml,
                    listJs
                ];
                grunt.log.writeln(this.name + ', writing dynamic table files');
                filesToReplace.forEach(function(element) {
                    replaceIdAndWrite(
                        element.srcPath,
                        element.destPath,
                        tableId);
                });
            }

        });

    grunt.registerTask('server', function (target) {

        if (target === 'test') {
            return grunt.task.run([
                'connect:test',
                'watch:livereload'
            ]);
        }

        grunt.task.run([
            'connect:livereload',
            'open',
            'watch'
        ]);
    });

    grunt.registerTask('default', [
        'server'
    ]);
};
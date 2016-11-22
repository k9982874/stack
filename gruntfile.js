module.exports = function(grunt) {
    "use strict";

    grunt.initConfig({
        ts: {
            app: {
                files: [{
                    src: ["src/\*\*/\*.ts", "!src/.baseDir.ts", "!src/_all.d.ts"],
                    dest: "."
                }],
                options: {
                    module: "commonjs",
                    noLib: true,
                    target: "es6",
                    sourceMap: false
                }
            }
        },
        tslint: {
            options: {
                configuration: "tslint.json"
            },
            files: {
                src: ["src/\*\*/\*.ts"]
            }
        },
        watch: {
            ts: {
                files: ["js/src/\*\*/\*.ts", "src/\*\*/\*.ts"],
                tasks: ["ts", "tslint"]
            }
        },
	nodemon: {
	    dev: {
        	script: "./bin/stack"
	    },
	    options: {
        	ignore: ['node_modules/**', 'Gruntfile.js'],
	        env: {
        	    PORT: '8000'
	        }
	    }
	},
	concurrent: {
	    watchers: {
        	tasks: ['nodemon', 'watch'],
	        options: {
        	    logConcurrentOutput: true
	        }
	    }
	}
    });

    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-tslint");
    grunt.loadNpmTasks("grunt-nodemon");
    grunt.loadNpmTasks("grunt-concurrent");

    grunt.registerTask("default", [
            "ts",
            "tslint"
    ]);

    grunt.registerTask("serve", [ "concurrent:watchers" ]);
};

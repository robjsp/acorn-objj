"use strict";

const
    chalk = require("chalk"),
    fs = require("fs"),
    path = require("path");

// Designed for use with process.stdin, but works with any ReadStream.
// From http://stackoverflow.com/a/16048083
exports.readStreamSync = function(stream)
{
    const bufSize = 8 * 1024;

    let buffer = new Buffer(bufSize),
        text = "",
        bytesRead;

    stream.setEncoding("utf8");

    // Loop as long as stdin input is available
    while (true)
    {
        bytesRead = 0;

        /* eslint-disable curly */

        try
        {
            bytesRead = fs.readSync(stream.fd, buffer, 0, bufSize);
        }
        catch (ex)
        {
            // istanbul ignore next: no way to test this
            if (ex.code === "EAGAIN")
            {
                // 'resource temporarily unavailable'
                // Happens on OS X 10.8.3 (not Windows 7!), if there's no
                // stdin input - typically when invoking a script without any
                // input (for interactive stdin input).
                // If you were to just continue, you'd create a tight loop.
                throw new Error("interactive stdin input not supported.");
            }
            else if (ex.code === "EOF")
            {
                // Happens on Windows 7, but not OS X 10.8.3:
                // simply signals the end of *piped* stdin input.
                break;
            }

            // istanbul ignore next: no way to test this
            throw ex; // Unexpected exception
        }

        if (bytesRead === 0)
        {
            // No more stdin input available.
            // OS X 10.8.3: regardless of input method, this is how the end
            //   of input is signaled.
            // Windows 7: this is how the end of input is signaled for
            //   *interactive* stdin input.
            break;
        }

        /* eslint-enable curly */

        // Process the chunk read.
        text += buffer.toString(null, 0, bytesRead);
    }

    return text;
};

exports.colorizeOptions = function(text)
{
    return text.replace(
        /(^|\s)--?\w[\w-]*/g, match => chalk.yellow(match)
    ).replace(
        /( - )(default: .+)/g, (match, sub1, sub2) => sub1 + chalk.green(sub2)
    );
};

exports.failWithMessage = function(message)
{
    throw new Error(exports.colorizeOptions(message));
};

exports.extendParser = function(parser, name, func, noNext)
{
    if (noNext)
        parser.extend(name, () => func.bind(parser));
    else
        parser.extend(name, next => func.bind(parser, next));
};

exports.getProcessRelativePath = function(file)
{
    let relativePath = path.relative(process.cwd(), file);

    // If the file path is not within cwd, make the path absolute
    if (relativePath.includes(".."))
        relativePath = path.resolve(file);

    return relativePath;
};

// Copied from acorn/src/state.js
exports.makeKeywordRegexp = function(words)
{
    return new RegExp("^(" + words.replace(/ /g, "|") + ")$");
};

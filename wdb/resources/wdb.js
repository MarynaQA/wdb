// Generated by CoffeeScript 1.3.3
(function() {
  var breakset, breakunset, check, cmd_hist, code, echo, execute, file, file_cache, last_cmd, make_ws, persist, persistable, print, register_handlers, select, send, started, stop, time, title, toggle_break, trace, ws,
    _this = this;

  time = function() {
    var d;
    d = new Date();
    return "" + (d.getHours()) + ":" + (d.getMinutes()) + ":" + (d.getSeconds()) + "." + (d.getMilliseconds());
  };

  started = false;

  stop = false;

  ws = null;

  send = function(msg) {
    console.log(time(), '->', msg);
    return ws.send(msg);
  };

  persistable = 'localStorage' in window && window.localStorage;

  if (persistable && localStorage['__wdb_cmd_hist']) {
    try {
      cmd_hist = JSON.parse(localStorage['__wdb_cmd_hist']);
      file_cache = JSON.parse(localStorage['__wdb_file_cache']);
    } catch (e) {
      file_cache = {};
      cmd_hist = {};
    }
  } else {
    file_cache = {};
    cmd_hist = {};
  }

  persist = function() {
    if (!persistable) {
      return;
    }
    localStorage['__wdb_cmd_hist'] = JSON.stringify(cmd_hist);
    return localStorage['__wdb_file_cache'] = JSON.stringify(file_cache);
  };

  $.SyntaxHighlighter.loadedExtras = true;

  $.SyntaxHighlighter.init({
    debug: true,
    lineNumbers: false,
    highlight: false,
    load: false
  });

  make_ws = function() {
    var new_ws,
      _this = this;
    console.log('Opening new socket');
    new_ws = new WebSocket("ws://" + document.location.hostname + ":" + this.__ws_port);
    new_ws.onclose = function(m) {
      console.log("close " + m);
      if (!stop) {
        return setTimeout((function() {
          return _this.ws = ws = make_ws();
        }), 1000);
      }
    };
    new_ws.onerror = function(m) {
      console.log("WebSocket error", m);
      if (!stop) {
        return setTimeout((function() {
          return _this.ws = ws = make_ws();
        }), 1000);
      }
    };
    new_ws.onopen = function(m) {
      console.log("WebSocket is open", m);
      if (!started) {
        register_handlers();
        started = true;
      }
      send('Start');
      $('body').show();
      return $('#eval').focus();
    };
    new_ws.onmessage = function(m) {
      var cmd, data, pipe;
      if (stop) {
        return;
      }
      pipe = m.data.indexOf('|');
      if (pipe > -1) {
        cmd = m.data.substr(0, pipe);
        data = JSON.parse(m.data.substr(pipe + 1));
      } else {
        cmd = m.data;
      }
      console.log(time(), '<-', cmd);
      switch (cmd) {
        case 'Title':
          return title(data);
        case 'Trace':
          return trace(data);
        case 'File':
          return file(data);
        case 'Check':
          return check(data);
        case 'Select':
          return select(data);
        case 'Print':
          return print(data);
        case 'Echo':
          return echo(data);
        case 'BreakSet':
          return breakset(data);
        case 'BreakUnset':
          return breakunset(data);
        case 'Dump':
          return echo(data);
      }
    };
    return new_ws;
  };

  $(function() {
    var end, xhr;
    end = function(page) {
      stop = true;
      if (ws) {
        try {
          send('Quit');
          ws.close();
        } catch (e) {
          ({});
        }
      }
      document.open();
      document.write(page);
      return document.close();
    };
    if (__ws_post) {
      xhr = $.ajax(location.href, {
        type: 'POST',
        data: __ws_post.data,
        contentType: __ws_post.enctype,
        traditional: true
      });
    } else {
      xhr = $.ajax(location.href);
    }
    xhr.done(function(data) {
      return end(data);
    }).fail(function(data) {
      if (data.responseText) {
        return end(data.responseText);
      }
    });
    _this.ws = ws = make_ws();
    return _this.onbeforeunload = function() {
      try {
        console.log('Try jit quit');
        send('Quit');
      } catch (e) {
        ({});
      }
      return void 0;
    };
  });

  title = function(data) {
    $('#title').text(data.title).append($('<small>').text(data.subtitle));
    $('#source').css({
      height: $(window).height() - $('#title').outerHeight(true)
    });
    return $('#traceback').css({
      height: $(window).height() - $('#title').outerHeight(true)
    });
  };

  trace = function(data) {
    var $tracecode, $tracefile, $tracefilelno, $tracefun, $tracefunfun, $traceline, $tracelno, frame, suffix, _i, _len, _ref;
    $('#traceback').empty();
    _ref = data.trace;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      frame = _ref[_i];
      $traceline = $('<div>').addClass('traceline').attr('id', 'trace-' + frame.level).attr('data-level', frame.level);
      $tracefile = $('<span>').addClass('tracefile').text(frame.file);
      $tracelno = $('<span>').addClass('tracelno').text(frame.lno);
      $tracefun = $('<span>').addClass('tracefun').text(frame["function"]);
      $tracefilelno = $('<div>').addClass('tracefilelno').append($tracefile).append($tracelno);
      $tracefunfun = $('<div>').addClass('tracefunfun').append($tracefun);
      if (frame.file.indexOf('site-packages') > 0) {
        suffix = frame.file.split('site-packages').slice(-1)[0];
        $tracefile.text(suffix);
        $tracefile.prepend($('<span>').addClass('tracestar').text('*').attr({
          title: frame.file
        }));
      }
      $tracecode = $('<div>').addClass('tracecode');
      code($tracecode, frame.code);
      $traceline.append($tracefilelno);
      $traceline.append($tracecode);
      $traceline.append($tracefunfun);
      $('#traceback').prepend($traceline);
    }
    return $('.traceline').on('click', function() {
      return send('Select|' + $(this).attr('data-level'));
    });
  };

  file = function(data) {
    code($('#sourcecode').empty(), data.file, ['linenums']);
    $('#sourcecode').attr('title', data.name);
    file_cache[data.name] = {
      file: $('#sourcecode').html(),
      sha512: data.sha512
    };
    return persist();
  };

  check = function(data) {
    var filename;
    filename = data.name;
    if (!(filename in file_cache) || file_cache[filename].sha512 !== data.sha512) {
      send("File");
    } else {
      send("NoFile");
    }
    return $('#eval').asuggest(data.words);
  };

  select = function(data) {
    var current_frame;
    current_frame = data.frame;
    $('.traceline').removeClass('selected');
    $('#trace-' + current_frame.level).addClass('selected');
    $('#eval').val('').attr('data-index', -1).attr('rows', 1).css({
      color: 'black'
    });
    if (current_frame.file !== $('#sourcecode').attr('title')) {
      $('#sourcecode').html(file_cache[current_frame.file].file);
      $('#sourcecode').attr('title', current_frame.file);
    }
    $('#sourcecode li.highlighted').removeClass('highlighted').addClass('highlighted-other');
    return $('#sourcecode').stop().animate({
      scrollTop: $('#sourcecode').find('li').eq(current_frame.lno - 1).addClass('highlighted').position().top - $('#sourcecode').innerHeight() / 2 + $('#sourcecode').scrollTop()
    }, 100);
  };

  code = function(parent, code, classes) {
    var cls, _i, _len;
    if (classes == null) {
      classes = [];
    }
    code = $('<code class="language">' + code + '</code>');
    for (_i = 0, _len = classes.length; _i < _len; _i++) {
      cls = classes[_i];
      code.addClass(cls);
    }
    parent.append(code);
    code.syntaxHighlight();
    code.find('span').each(function() {
      var txt;
      txt = $(this).text();
      if (txt.length > 128) {
        $(this).text('');
        $(this).append($('<span class="short close">').text(txt.substr(0, 128)));
        return $(this).append($('<span class="long">').text(txt.substr(128)));
      }
    });
    return code;
  };

  last_cmd = null;

  execute = function(snippet) {
    var cmd, data, key, space;
    cmd = function(cmd) {
      send(cmd);
      return last_cmd = cmd;
    };
    if (snippet.indexOf('.') === 0) {
      space = snippet.indexOf(' ');
      if (space > -1) {
        key = snippet.substr(1, space - 1);
        data = snippet.substr(space + 1);
      } else {
        key = snippet.substr(1);
        data = '';
      }
      switch (key) {
        case 's':
          cmd('Step');
          break;
        case 'n':
          cmd('Next');
          break;
        case 'r':
          cmd('Return');
          break;
        case 'c':
          cmd('Continue');
          break;
        case 'u':
          cmd('Until');
          break;
        case 'q':
          cmd('Quit');
          break;
        case 'p':
          cmd('Eval|pprint(' + data + ')');
          break;
        case 'j':
          cmd('Jump|' + data);
          break;
        case 'b':
          toggle_break(data);
      }
      return;
    } else if (snippet === '' && last_cmd) {
      cmd(last_cmd);
      return;
    }
    return send("Eval|" + snippet);
  };

  print = function(data) {
    var filename, snippet;
    snippet = $('#eval').val();
    code($('#scrollback'), snippet, ['prompted']);
    code($('#scrollback'), data.result);
    $('#eval').val('').attr('data-index', -1).attr('rows', 1).css({
      color: 'black'
    });
    filename = $('.selected .tracefile').text();
    if (!(filename in cmd_hist)) {
      cmd_hist[filename] = [];
    }
    cmd_hist[filename].unshift(snippet);
    persist();
    return $('#interpreter').stop(true).animate({
      scrollTop: $('#scrollback').height()
    }, 1000);
  };

  echo = function(data) {
    code($('#scrollback'), data["for"], ['prompted']);
    code($('#scrollback'), data.val || '');
    return $('#interpreter').stop(true).animate({
      scrollTop: $('#scrollback').height()
    }, 1000);
  };

  breakset = function(data) {
    var $eval;
    $('.linenums li').eq(data.lno - 1).removeClass('ask-breakpoint').addClass('breakpoint');
    $eval = $('#eval');
    if ($eval.val().indexOf('.b ') === 0) {
      return $eval.val('');
    }
  };

  breakunset = function(data) {
    var $eval;
    $('.linenums li').eq(data.lno - 1).removeClass('ask-breakpoint');
    $eval = $('#eval');
    if ($eval.val().indexOf('.b ') === 0) {
      return $eval.val('');
    }
  };

  toggle_break = function(lno) {
    var $line;
    if (('' + lno).indexOf(':') > -1) {
      ws.send('Break|' + lno);
    }
    $line = $('.linenums li').eq(lno - 1);
    if ($line.hasClass('breakpoint')) {
      ws.send('Unbreak|' + lno);
      return $line.removeClass('breakpoint').addClass('ask-breakpoint');
    } else {
      $line.addClass('ask-breakpoint');
      return ws.send('Break|' + lno);
    }
  };

  register_handlers = function() {
    $('body,html').on('keydown', function(e) {
      if ((e.ctrlKey && e.keyCode === 37) || e.keyCode === 119) {
        send('Continue');
        return false;
      }
      if ((e.ctrlKey && e.keyCode === 38) || e.keyCode === 120) {
        send('Return');
        return false;
      }
      if ((e.ctrlKey && e.keyCode === 39) || e.keyCode === 121) {
        send('Next');
        return false;
      }
      if ((e.ctrlKey && e.keyCode === 40) || e.keyCode === 122) {
        send('Step');
        return false;
      }
      if (e.keyCode === 118) {
        send('Until');
        return false;
      }
    });
    $('#eval').on('keydown', function(e) {
      var $eval, endPos, filename, index, startPos, to_set, txtarea;
      if (e.ctrlKey) {
        e.stopPropagation();
        return;
      }
      if (e.keyCode === 13) {
        $eval = $(this);
        if (!e.shiftKey) {
          execute($eval.val());
          return false;
        } else {
          return $eval.attr('rows', parseInt($eval.attr('rows')) + 1);
        }
      } else if (e.keyCode === 9) {
        $eval = $(this);
        txtarea = $eval.get(0);
        startPos = txtarea.selectionStart;
        endPos = txtarea.selectionEnd;
        if (startPos || startPos === '0') {
          $eval.val($eval.val().substring(0, startPos) + '    ' + $eval.val().substring(endPos, $eval.val().length));
        } else {
          $eval.val($eval.val() + '    ');
        }
        return false;
      } else if (e.keyCode === 38) {
        $eval = $(this);
        filename = $('.selected .tracefile').text();
        if (!e.shiftKey) {
          if (filename in cmd_hist) {
            index = parseInt($eval.attr('data-index')) + 1;
            if (index >= 0 && index < cmd_hist[filename].length) {
              to_set = cmd_hist[filename][index];
              if (index === 0) {
                $eval.attr('data-current', $eval.val());
              }
              $eval.val(to_set).attr('data-index', index).attr('rows', to_set.split('\n').length);
              return false;
            }
          }
        }
      } else if (e.keyCode === 40) {
        $eval = $(this);
        filename = $('.selected .tracefile').text();
        if (!e.shiftKey) {
          if (filename in cmd_hist) {
            index = parseInt($eval.attr('data-index')) - 1;
            if (index >= -1 && index < cmd_hist[filename].length) {
              if (index === -1) {
                to_set = $eval.attr('data-current');
              } else {
                to_set = cmd_hist[filename][index];
              }
              $eval.val(to_set).attr('data-index', index).attr('rows', to_set.split('\n').length);
              return false;
            }
          }
        }
      }
    });
    $("#scrollback").on('click', 'a.inspect', function() {
      ws.send('Inspect|' + $(this).attr('href'));
      return false;
    }).on('click', '.short.close', function() {
      return $(this).addClass('open').removeClass('close').next('.long').show('fast');
    }).on('click', '.long,.short.open', function() {
      var elt;
      elt = $(this).hasClass('long') ? $(this) : $(this).next('.long');
      return elt.hide('fast').prev('.short').removeClass('open').addClass('close');
    });
    return $("#sourcecode").on('click', '.linenums li', function() {
      var lno;
      lno = $(this).parent().find('li').index(this) + 1;
      return toggle_break(lno);
    });
  };

}).call(this);

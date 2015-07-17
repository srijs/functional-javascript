'use strict';

//---

let tailChain = function (m, fn) {
  m.tailMap(function (a, wrap) {
    fn(a, function (b, cb) {
      wrap(b, function (mm) {
        cb(mm.join());
      });
    });
  });
};

let Writer = function (w, a) {
  if (!(this instanceof Writer)) {
    return new Writer(w, a);
  }
  this.w = w;
  this.a = a;
};

Writer.prototype.join = function () {
  return Writer(this.w.concat(this.a.w), this.a.a);
};

Writer.prototype.tailMap = function (fn) {
  return fn(this.a, function (b, cb) {
    return cb(Writer(this.w, b));
  }.bind(this));
};

Writer.prototype.of = function (a) {
  return Writer(this.w.empty(), a);
};

//---

let Log = function (log) {
  if (!(this instanceof Log)) {
    return new Log(log);
  }
  this.log = log;
};

Log.prototype.empty = function () {
  return Log([]);
};

Log.prototype.concat = function (log) {
  return Log(this.log.concat(log.log));
};

//---

let warn = function (message) {
  return Writer(
    Log([{level: 'warn', message: message}])
  );
};

let info = function (message) {
  return Writer(
    Log([{level: 'info', message: message}])
  );
};

//---

let run = function (m, gen, cb) {
  let running = function *() {
    let r = yield *gen(gen);
    return m.of(r);
  }();
  let rec = function (value, cb) {
    let next = running.next(value);
    if (next.done) {
      return cb(next.value);
    }
    tailChain(next.value, function (a, wrap) {
      rec(a, function (b) {
        wrap(b, cb);
      });
    });
  };
  return rec(null, cb);
};

//---

let LogWriter = Writer(Log());

let hello = function* (v) {
  yield info('hello ' + v);
  return v + 1;
};

let log = function* () {
  let v = yield LogWriter.of(42);
  let w = yield* hello(v);
  let x = yield* hello(w);
  yield warn('all done');
  return x;
};

run(LogWriter, log, function (writer) {
  console.log(JSON.stringify(writer, null, 2));
});

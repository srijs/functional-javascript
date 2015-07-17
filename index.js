'use strict';

//---

let Writer = function (w, a) {
  if (!(this instanceof Writer)) {
    return new Writer(w, a);
  }
  this.w = w;
  this.a = a;
};

Writer.prototype.chain = function (fn) {
  let that = this;
  let writer = fn(that.a);
  return new Writer(that.w.concat(writer.w), writer.a);
};

Writer.prototype.of = function (a) {
  return new Writer(this.w.empty(), a);
};

//---

let Log = function (log) {
  if (!(this instanceof Log)) {
    return new Log(log);
  }
  this.log = log;
};

Log.prototype.empty = function () {
  return new Log([]);
};

Log.prototype.concat = function (log) {
  return new Log(this.log.concat(log.log));
};

//---

let warn = function (message) {
  return new Writer(
    new Log([{level: 'warn', message: message}])
  );
};

let info = function (message) {
  return new Writer(
    new Log([{level: 'info', message: message}])
  );
};

//---

let $do = function (gen, value) {
  let running = gen();
  let rec = function (value) {
    let next = running.next(value);
    if (next.done) {
      return next.value;
    }
    return next.value.chain(rec);
  };
  return rec();
};

//---

let LogWriter = Writer(Log());

let hello = function (v) {
  return $do(function* () {
    yield info('hello ' + v);
    return LogWriter.of(v + 1);
  });
};

let log = $do(function* () {
  let v = yield LogWriter.of(42);
  let w = yield hello(v);
  let x = yield hello(w);
  yield warn('all done');
  return LogWriter.of(x);
});

console.log(JSON.stringify(log, null, 2));

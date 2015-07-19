'use strict';

//---

let Writer = function (w, a) {
  if (!(this instanceof Writer)) {
    return new Writer(w, a);
  }
  this.w = w;
  this.a = a;
};

Writer.prototype.tell = function (w) {
  return Writer(w);
};

Writer.prototype.of = function (a) {
  return Writer(this.w.empty(), a);
};

Writer.prototype.map = function (f) {
  return Writer(this.w, f(this.a));
};

Writer.prototype.chain = function (fn) {
  return this.join(fn(this.a));
};

Writer.prototype.sequenceNext = function () {
  return {
    value: Writer(this.w.concat(this.a.value.w), this.a.value.a),
    done: this.a.done
  };
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

let run = function (m, gen) {
  let running = function *() {
    return m.of(yield *gen());
  }();
  let next = {value: m.of(null), done: false};
  while (!next.done) {
    next = next.value.map(function (a) {
      return running.next(a);
    }).sequenceNext();
  }
  return next.value;
};

//---

let LogWriter = Writer(Log());

let warn = function* (message) {
  yield LogWriter.tell(Log([{level: 'warn', message: message}]));
};

let info = function* (message) {
  yield LogWriter.tell(Log([{level: 'info', message: message}]));
};

//--

let hello = function* (v) {
  yield* info('hello ' + v);
  return v + 1;
};

let log = function* () {
  let v = yield LogWriter.of(42);
  let w = yield* hello(v);
  let x = yield* hello(w);
  let y = yield* hello(x);
  let z = yield* hello(y);
  yield* warn('all done');
  return z;
};

var countdown = function* (n) {
  yield* info('hello ' + n);
  if (n > 0) {
    yield* countdown(n - 1);
  } else {
    return n;
  }
};

var countdown42 = function *() {
  yield *countdown(10);
  return 100;
};

var writer = run(LogWriter, log);
console.log(JSON.stringify(writer, null, 2));

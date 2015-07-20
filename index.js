'use strict';

//---

let Next = function (value, done) {
  this.value = value;
  this.done = done;
};

Next.fromNext = function (next) {
  return new Next(next.value, next.done);
};

Next.of = function (value) {
  return new Next(value, false);
};

Next.prototype.map = function (f) {
  return new Next(f(this.value), this.done);
};

Next.prototype.ap = function (b) {
  return new Next(this.value(b.value), b.done);
};

//---

let Writer = function (w, a) {
  if (!(this instanceof Writer)) {
    return new Writer(w, a);
  }
  this.w = w;
  this.a = a;
};

// Writer w a -> w -> Writer w a
Writer.prototype.tell = function (w) {
  return Writer(w);
};

// Writer w a -> b -> Writer w b
Writer.prototype.of = function (a) {
  return Writer(this.w.empty(), a);
};

// Writer w a -> (a -> b) -> Writer w b
Writer.prototype.map = function (f) {
  return Writer(this.w, f(this.a));
};

// Writer w a -> (a -> Writer w b) -> Writer w b
Writer.prototype.chain = function (f) {
  let writer = f(this.a);
  return new Writer(this.w.concat(writer.w), writer.a);
};

// Writer w a -> Generator (Writer w a) -> Writer w a
Writer.prototype.chainGen = function (gen) {
  return this.chain(function (a) {
    let running = function *() {
      return this.of(yield *gen(a));
    }.bind(this)();
    let next = Next.of(this.of(a));
    while (!next.done) {
      next = Next.fromNext(running.next(next.value.a)).map(function (writer) {
        return new Writer(next.value.w.concat(writer.w), writer.a);
      });
    }
    return next.value;
  }.bind(this));
};

//---

let Reader = function (runReader) {
  if (!(this instanceof Reader)) {
    return new Reader(runReader);
  }
  this.runReader = runReader;
};

// Reader r a
Reader.ask = function () {
  return new Reader(function (r) { return r; });
};

// a -> Reader r a
Reader.of = function (a) {
  return new Reader(function (_) { return a; });
};

// Reader r a -> (a -> b) -> Reader r b
Reader.prototype.map = function (f) {
  return new Reader(function (r) {
    return f(this.runReader(r));
  }.bind(this));
};

// Reader r a -> (a -> Reader r b) -> Reader r b
Reader.prototype.chain = function (f) {
  return new Reader(function (r) {
    return f(this.runReader(r)).runReader(r);
  }.bind(this));
};

// Reader r a -> Generator (Reader r a) -> Reader r a
Reader.prototype.chainGen = function (gen) {
  return this.chain(function (a) {
    let running = function *() {
      return Reader.of(yield *gen(a));
    }();
    return Reader.ask().chain(function (r) {
      let next = Next.of(Reader.of(a));
      while (!next.done) {
        let a = next.value.runReader(r);
        next = Next.fromNext(running.next(a));
      }
      return next.value;
    });
  });
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

/*var countdown = function* (n) {
  yield* info('hello ' + n);
  if (n > 0) {
    yield* countdown(n - 1);
  } else {
    return n;
  }
};

var countdown42 = function *() {
  yield *countdown(42);
  return 100;
};*/

var writer = LogWriter.of(null).chainGen(log);
console.log(JSON.stringify(writer, null, 2));

/*var incr = function* (a) {
  let r = yield Reader.ask();
  return r + a;
};

var reader = Reader.of(4).chainGen(function* (a) {
  yield* incr(a);
  let x = yield* incr(a);
  return x;
}).runReader(42);

console.log(JSON.stringify(reader, null, 2));*/

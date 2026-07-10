/**
 * @fileoverview A file for serialization/deserialization of web graph inputs
 * and outputs.
 */

(function(scope){
'use strict';

/**
 * Serializer takes a list of output streams from a graph and then
 * will serialize the last output packet from each of them into a single binary
 * data blob, called a SerializedDataBundle. Must be created before the graph is
 * started.
 */
class Serializer {
  /**
   * @param Module An instantiated and compiled Emscripten WebAssembly Module.
   * @param outputStreams The list of strings which are the output stream names,
   *   in order, to serialize data from.
   */
  constructor(Module, outputStreams) {
    this.Module = Module;
    this.serializer = Module._newSerializer();
    for (const outputStream of outputStreams) {
      Module.ccall('addStreamSerializer',
          null, ['number', 'string'], [this.serializer, outputStream]);
    }
  }

  /**
   * Takes the most recently output packets from each of our output streams (if
   * any such packets exist), and serializes them all into a binary blob, which
   * is output into the given outputArray.
   * @param outputArray The Uint8Array to be written over with serialized packet
   *   data. Must be large enough to contain all the serialized data (with 4
   *   additional bytes per stream for data size, and up to 3 additional bytes
   *   per stream for alignment padding). Otherwise a console error will log the
   *   discrepancy.
   */
  getSerializedOutput(outputArray) {
    const serializedDataPtr = this.Module._getSerializedData(this.serializer);

    // Data size should be queried after data.
    const serializedDataSize =
        this.Module._getSerializedDataSize(this.serializer);

    if (serializedDataSize > outputArray.length) {
      console.error(
          'Output array too small for serialization, needs to be at least ',
          serializedDataSize);
    }

    const serializedDataArray = new Uint8Array(
        this.Module.HEAPU8.buffer, serializedDataPtr, serializedDataSize);
    outputArray.set(serializedDataArray);
  }

  /**
   * Frees serializer memory.
   */
  free() {
    this.Module._freeSerializer(this.serializer);
    this.serializer = null;
  }
}

/**
 * Deserializer takes a list of input streams to a graph and then will
 * deserialize a SerializedDataBundle, and pass the resulting packets directly
 * into the graph. The list of input streams given here should correspond, in
 * order, to the output streams used to initialize the matching Serializer
 * class. Must be created before the graph is started.
 */
class Deserializer {
  /**
   * @param Module An instantiated and compiled Emscripten WebAssembly Module.
   * @param inputStreams The list of strings which are the input stream names,
   *   in order, to deserialize data to.
   */
  constructor(Module, inputStreams) {
    this.Module = Module;
    this.deserializer = Module._newDeserializer();
    this.dataBundlePtr = null;
    this.dataBundleSize = 0;
    for (const inputStream of inputStreams) {
      Module.ccall('addStreamDeserializer', null, ['number', 'string'],
          [this.deserializer, inputStream]);
    }
  }

  /**
   * Processes a serialized data bundle, deserializing it into packets and
   * passing them into our graph.
   * @param dataArray Uint8Array holding the serialized data bundle.
   */
  processSerializedData(dataArray) {
    if (dataArray.length <= 0) return;

    // Our usual song-and-dance to grab some space in the Module

    // +3 to let us align to a multiple of 4, if necessary (we pad internally
    // so our size uint32_t's are aligned)
    const size = dataArray.length + 3;

    if (this.dataBundleSize != size) {
      if (this.dataBundlePtr) {
        this.Module._free(this.dataBundlePtr);
      }
      this.dataBundlePtr = this.Module._malloc(size);
      this.dataBundleSize = size;
    }

    const alignedDataBundlePtr =
        this.dataBundlePtr + (4 - this.dataBundlePtr % 4) % 4;

    // Now copy over our SAB's data and deserialize for processing
    this.Module.HEAPU8.set(dataArray, alignedDataBundlePtr);
    this.Module._processSerializedData(this.deserializer, alignedDataBundlePtr);
  }

  /**
   * Frees deserializer memory.
   */
  free() {
    if (this.dataBundlePtr) {
      this.Module._free(this.dataBundlePtr);
    }
    this.dataBundlePtr = null;
    this.dataBundleSize = 0;
    this.Module._freeDeserializer(this.deserializer);
    this.deserializer = null;
  }
}

/**
 * Quick factory, so we can bake in our wasm Module on load.
 */
class SerializationFactory {
  constructor(Module) {
    this.Module = Module;
  }

  /**
   * Public method for creating a new Serializer.
   * @param outputStreams The ordered list of strings which are stream names to
   *   serialize.
   * @returns Serializer A new Serializer, constructed accordingly.
   */
  createSerializer(outputStreams) {
    return new Serializer(this.Module, outputStreams);
  }

  /**
   * Public method for creating a new Deserializer.
   * @param inputStreams The ordered list of strings which are stream names to
   *   deserialize from.
   * @returns Deserializer A new Deserializer, constructed accordingly.
   */
  createDeserializer(inputStreams) {
    return new Deserializer(this.Module, inputStreams);
  }
}

// We only expose serialization through our factory construction methods, so we
// can use our DemoApiPromise as the mechanism for passing in Module, like with
// the normal DemoApi.
scope.SerializationFactory = SerializationFactory;

})(self);

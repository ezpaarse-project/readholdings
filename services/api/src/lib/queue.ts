export default function createInMemoryQueue<
  DataType,
  ReturnType,
  FncType extends (data: DataType) => Promise<ReturnType> = (data: DataType) => Promise<ReturnType>,
>(process: FncType) {
  const queue: DataType[] = [];
  const results: ReturnType[] = [];
  let processing: Promise<void> | undefined;

  const processQueue = async () => {
    while (queue.length > 0) {
      const data = queue.shift();
      if (!data) {
        break;
      }

      // eslint-disable-next-line no-await-in-loop
      const result = await process(data);
      results.push(result);
    }

    processing = undefined;
  };

  return {
    get size() {
      return queue.length;
    },
    push(data: DataType) {
      queue.push(data);
      if (!processing) {
        processing = processQueue();
      }
    },
    async flush(): Promise<ReturnType[]> {
      await processing;

      return results;
    },
  };
}

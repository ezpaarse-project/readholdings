export default function createInMemoryQueue<
  DataType,
  ReturnType,
  FncType extends (data: DataType) => Promise<ReturnType> = (data: DataType) => Promise<ReturnType>,
>(process: FncType) {
  const queue: DataType[] = [];
  const promises: Promise<ReturnType>[] = [];
  let current: Promise<ReturnType> | undefined;

  const next = async () => {
    const processing = queue.shift();
    if (!processing) {
      return;
    }

    promises.push(process(processing));
    await promises.at(-1)!;
    next();
  };

  return {
    push(data: DataType) {
      queue.push(data);
      if (!current) {
        next();
      }
    },
    flush(): Promise<ReturnType[]> {
      return Promise.all(promises);
    },
  };
}

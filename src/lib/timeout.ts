export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(message)), ms)
    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(t)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(t)
        reject(error)
      }
    )
  })
}

/** Every endpoint service implements this. `use` performs the endpoint's action. */
export interface IService<TInput, TOutput> {
  use(input: TInput): Promise<TOutput>;
}

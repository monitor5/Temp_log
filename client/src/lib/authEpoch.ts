// A local generation counter, never a credential. Ignore old-session failures
// that arrive after a successful login or an explicit session transition.
let epoch = 0;
export const getAuthEpoch = () => epoch;
export const advanceAuthEpoch = () => ++epoch;

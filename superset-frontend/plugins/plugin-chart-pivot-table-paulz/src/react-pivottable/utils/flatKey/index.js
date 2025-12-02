// Given an array of attribute values, convert to a key that
// can be used in objects.
const flatKey = attrVals => attrVals.join(String.fromCharCode(0));

export { flatKey };

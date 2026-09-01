const input = jest.fn().mockResolvedValue('');
const select = jest.fn().mockResolvedValue(undefined);

module.exports = {
  input,
  select,
  checkbox: jest.fn().mockResolvedValue([]),
  confirm: jest.fn().mockResolvedValue(false),
  password: jest.fn().mockResolvedValue(''),
  rawlist: jest.fn().mockResolvedValue(undefined),
  expand: jest.fn().mockResolvedValue(undefined),
  editor: jest.fn().mockResolvedValue(''),
  search: jest.fn().mockResolvedValue(undefined),
  number: jest.fn().mockResolvedValue(0),
};

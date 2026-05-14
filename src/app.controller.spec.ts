import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns the health payload', () => {
    const controller = new AppController();

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'finance-manager-api',
    });
  });
});

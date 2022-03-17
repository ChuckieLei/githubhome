import EventEmitter from 'event-emitter';

class EM {}
const EventManager = EventEmitter(new EM().prototype);
export default EventManager;

export type SmsReceivedEvent = {
  /** Originating address / sender id, e.g. "CITY BANK". */
  sender: string;
  /** Full message body (multipart messages concatenated). */
  body: string;
};

export type SmsListenerModuleEvents = {
  onSmsReceived: (event: SmsReceivedEvent) => void;
};

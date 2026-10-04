import {expect,it} from "vitest";
import {messageTime} from "@/src/components/mobile-ui/communication-presentation";
it.each([null,undefined,"","invalid","2026-99-99"])("does not fabricate time for %s",value=>expect(messageTime(value)).toBe("Hora no disponible"));
it.each(["2026-10-03T21:07:00.000Z","1970-01-01T00:00:00.000Z"])("uses the supplied valid timestamp %s in the current locale",value=>expect(messageTime(value)).toBe(new Date(value).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})));

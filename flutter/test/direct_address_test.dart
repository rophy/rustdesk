import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_hbb/utils/address_utils.dart';

void main() {
  group('isDirectAddress', () {
    group('IPv4', () {
      test('plain IP', () {
        expect(isDirectAddress('192.168.1.1'), isTrue);
      });

      test('IP with port', () {
        expect(isDirectAddress('192.168.1.1:21118'), isTrue);
      });

      test('localhost', () {
        expect(isDirectAddress('127.0.0.1'), isTrue);
      });

      test('all zeros', () {
        expect(isDirectAddress('0.0.0.0'), isTrue);
      });

      test('broadcast', () {
        expect(isDirectAddress('255.255.255.255'), isTrue);
      });
    });

    group('IPv6', () {
      test('bracketed IPv6 with port', () {
        expect(isDirectAddress('[::1]:21118'), isTrue);
      });

      test('bracketed full IPv6', () {
        expect(isDirectAddress('[2001:db8::1]:8080'), isTrue);
      });
    });

    group('domain:port', () {
      test('simple domain with port', () {
        expect(isDirectAddress('host.example.com:21118'), isTrue);
      });

      test('subdomain with port', () {
        expect(isDirectAddress('relay.my-server.org:443'), isTrue);
      });

      test('domain without port is not direct', () {
        expect(isDirectAddress('host.example.com'), isFalse);
      });
    });

    group('numeric peer IDs (should NOT match)', () {
      test('short numeric ID', () {
        expect(isDirectAddress('123456789'), isFalse);
      });

      test('long numeric ID', () {
        expect(isDirectAddress('160118877'), isFalse);
      });

      test('formatted numeric ID with spaces', () {
        expect(isDirectAddress('160 118 877'), isFalse);
      });
    });

    group('edge cases', () {
      test('empty string', () {
        expect(isDirectAddress(''), isFalse);
      });

      test('single word', () {
        expect(isDirectAddress('hello'), isFalse);
      });

      test('port only', () {
        expect(isDirectAddress(':8080'), isFalse);
      });

      test('bare hostname with port but no TLD', () {
        expect(isDirectAddress('localhost:8080'), isFalse);
      });
    });
  });
}

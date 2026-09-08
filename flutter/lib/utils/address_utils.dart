bool isDirectAddress(String id) {
  final ipv4 = RegExp(
      r'^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(:\d{1,5})?$');
  if (ipv4.hasMatch(id)) return true;
  if (id.contains(':') && id.contains('[')) return true;
  final domainPort = RegExp(
      r'^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}:\d{1,5}$');
  if (domainPort.hasMatch(id)) return true;
  return false;
}

import unittest
from make_assetlinks import assetlinks_from_keytool_output


class TestAssetLinks(unittest.TestCase):
    def test_valid_fingerprint(self):
        fp = ':'.join(['ab'] * 32)
        output = assetlinks_from_keytool_output('Owner: test\nSHA256: ' + fp)
        target = output[0]['target']
        self.assertEqual(target['sha256_cert_fingerprints'][0], fp.upper())
        self.assertEqual(target['package_name'], 'com.fieldforcehub.mobile')
        self.assertEqual(output[0]['relation'], ['delegate_permission/common.handle_all_urls'])

    def test_invalid_fingerprint_rejected(self):
        with self.assertRaises(ValueError):
            assetlinks_from_keytool_output('SHA256: invalid')


if __name__ == '__main__':
    unittest.main()
